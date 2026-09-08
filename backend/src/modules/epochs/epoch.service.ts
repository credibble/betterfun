import { type DataSource } from "typeorm";
import { v4 as uuid } from "uuid";
import { Epoch } from "./epoch.entity.js";
import { env } from "../../config/env.js";
import { broadcast } from "../realtime/ws-hub.js";
import { logger } from "../../lib/logger.js";

export class EpochService {
  private epochRepo;

  constructor(private dataSource: DataSource) {
    this.epochRepo = dataSource.getRepository(Epoch);
  }

  /**
   * Get all epochs, most recent first.
   */
  async list(): Promise<Epoch[]> {
    return this.epochRepo.find({ order: { number: "DESC" } });
  }

  /**
   * Get epoch by ID.
   */
  async getById(id: string): Promise<Epoch | null> {
    return this.epochRepo.findOne({ where: { id } });
  }

  /**
   * Get the currently active (live) epoch.
   */
  async getActive(): Promise<Epoch | null> {
    return this.epochRepo.findOne({ where: { status: "live" }, order: { number: "DESC" } });
  }

  /**
   * Get the latest epoch (any status).
   */
  async getLatest(): Promise<Epoch | null> {
    const rows = await this.epochRepo.find({ order: { number: "DESC" }, take: 1 });
    return rows[0] ?? null;
  }

  /**
   * Get an epoch by its sequential number.
   */
  async getByNumber(number: number): Promise<Epoch | null> {
    return this.epochRepo.findOne({ where: { number } });
  }

  /**
   * Get the upcoming epoch (funding open).
   */
  async getUpcoming(): Promise<Epoch | null> {
    return this.epochRepo.findOne({ where: { status: "upcoming" }, order: { number: "ASC" } });
  }

  /**
   * Create a new epoch.
   */
  async create(input: {
    number: number;
    startsAt: Date;
    endsAt: Date;
  }): Promise<Epoch> {
    const epoch = this.epochRepo.create({
      id: uuid(),
      number: input.number,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      status: "upcoming",
    });
    return this.epochRepo.save(epoch);
  }

  /**
   * Create the next epoch, chaining from the latest one's end time.
   * Uses EPOCH_LENGTH_H and EPOCH_ROLLOVER (how many epochs to keep visible
   * ahead of the current one). Returns the created epoch, or null if a
   * sufficient next epoch already exists.
   */
  async ensureNext(): Promise<Epoch | null> {
    const latest = await this.getLatest();

    if (latest && latest.status === "upcoming") {
      return null; // an upcoming epoch already exists
    }

    // Chain from the latest epoch's end, but always leave a funding window so
    // traders can create pots and followers can deposit before it locks.
    const base = latest?.endsAt ? latest.endsAt.getTime() : Date.now();
    const startsAt = new Date(Math.max(base, Date.now() + env.EPOCH_FUNDING_WINDOW_MIN * 60 * 1000));
    const endsAt = new Date(startsAt.getTime() + env.EPOCH_LENGTH_MIN * 60 * 1000);
    const nextNumber = (latest?.number ?? 0) + 1;

    const epoch = await this.create({ number: nextNumber, startsAt, endsAt });
    logger.info(`Epoch ${epoch.number} created (${epoch.startsAt.toISOString()} → ${epoch.endsAt.toISOString()})`);
    return epoch;
  }

  /**
   * Transition epoch to "live" (start trading).
   */
  async goLive(id: string): Promise<Epoch | null> {
    const epoch = await this.getById(id);
    if (!epoch || epoch.status !== "upcoming") return null;
    epoch.status = "live";
    const saved = await this.epochRepo.save(epoch);
    this.emit(saved);
    return saved;
  }

  /**
   * Transition epoch to "settling" (all pots entering settlement).
   */
  async goSettling(id: string): Promise<Epoch | null> {
    const epoch = await this.getById(id);
    if (!epoch || epoch.status !== "live") return null;
    epoch.status = "settling";
    const saved = await this.epochRepo.save(epoch);
    this.emit(saved);
    return saved;
  }

  /**
   * Transition epoch to "settled" (all payouts done).
   */
  async goSettled(id: string): Promise<Epoch | null> {
    const epoch = await this.getById(id);
    if (!epoch || epoch.status !== "settling") return null;
    epoch.status = "settled";
    const saved = await this.epochRepo.save(epoch);
    this.emit(saved);
    return saved;
  }

  private emit(epoch: Epoch): void {
    broadcast("epochs", {
      type: "epoch:update",
      epoch: {
        id: epoch.id,
        number: epoch.number,
        startsAt: epoch.startsAt.toISOString(),
        endsAt: epoch.endsAt.toISOString(),
        status: epoch.status,
        potCount: epoch.potCount,
        tvl: Number(epoch.tvl),
        createdAt: epoch.createdAt.toISOString(),
      },
    });
  }
}
