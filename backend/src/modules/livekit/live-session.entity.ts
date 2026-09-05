import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { Pot } from "../pots/pot.entity.js";
import { TraderProfile } from "../traders/trader-profile.entity.js";

@Entity("live_sessions")
export class LiveSession {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid" })
  potId!: string;

  @ManyToOne(() => Pot, { onDelete: "CASCADE" })
  @JoinColumn({ name: "potId" })
  pot!: Pot;

  @Column({ type: "uuid" })
  traderId!: string;

  @ManyToOne(() => TraderProfile, { onDelete: "CASCADE" })
  @JoinColumn({ name: "traderId" })
  trader!: TraderProfile;

  @Column({ type: "varchar", length: 100 })
  livekitRoom!: string;

  @Column({ type: "varchar", length: 200, default: "" })
  title!: string;

  @Column({ type: "varchar", length: 20, default: "active" })
  status!: "active" | "ended";

  @Column({ type: "int", default: 0 })
  viewerCount!: number;

  @Column({ type: "timestamptz" })
  startedAt!: Date;

  @Column({ type: "timestamptz", nullable: true })
  endedAt?: Date;

  @CreateDateColumn()
  createdAt!: Date;
}
