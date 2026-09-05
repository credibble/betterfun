import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { Pot } from "../pots/pot.entity.js";

@Entity("positions")
export class Position {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid" })
  potId!: string;

  @ManyToOne(() => Pot, { onDelete: "CASCADE" })
  @JoinColumn({ name: "potId" })
  pot!: Pot;

  @Column({ type: "varchar", length: 100 })
  marketId!: string;

  @Column({ type: "varchar", length: 50 })
  symbol!: string;

  @Column({ type: "varchar", length: 4 })
  side!: "up" | "down";

  @Column({ type: "decimal", precision: 20, scale: 6, default: 0 })
  contracts!: number;

  @Column({ type: "decimal", precision: 10, scale: 6, default: 0 })
  avgPrice!: number;

  @Column({ type: "varchar", length: 20, default: "open" })
  status!: "open" | "resolved";

  @Column({ type: "decimal", precision: 20, scale: 6, default: 0 })
  realizedPnl!: number;

  @Column({ type: "boolean", nullable: true })
  win?: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
