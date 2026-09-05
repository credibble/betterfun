import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { Pot } from "../pots/pot.entity.js";
import { Epoch } from "../epochs/epoch.entity.js";

@Entity("payouts")
export class Payout {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid" })
  potId!: string;

  @ManyToOne(() => Pot, { onDelete: "CASCADE" })
  @JoinColumn({ name: "potId" })
  pot!: Pot;

  @Column({ type: "uuid" })
  epochId!: string;

  @ManyToOne(() => Epoch, { onDelete: "CASCADE" })
  @JoinColumn({ name: "epochId" })
  epoch!: Epoch;

  @Column({ type: "decimal", precision: 20, scale: 6 })
  perShare!: number;

  @Column({ type: "decimal", precision: 20, scale: 6, default: 0 })
  traderCutUsd!: number;

  @Column({ type: "decimal", precision: 20, scale: 6, default: 0 })
  protocolCutUsd!: number;

  @Column({ type: "decimal", precision: 20, scale: 6, default: 0 })
  lpDistributedUsd!: number;

  @Column({ type: "jsonb", default: () => "'{}'::jsonb" })
  distribution!: Record<string, number>;

  @Column({ type: "varchar", length: 20, default: "pending" })
  status!: "pending" | "distributed" | "claimed";

  @CreateDateColumn()
  createdAt!: Date;
}
