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

@Entity("orders")
export class Order {
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

  @Column({ type: "varchar", length: 66, nullable: true })
  exchangeOrderId?: string;

  @Column({ type: "decimal", precision: 10, scale: 6 })
  price!: number;

  @Column({ type: "decimal", precision: 20, scale: 6 })
  quantity!: number;

  @Column({ type: "decimal", precision: 20, scale: 6, default: 0 })
  filled!: number;

  @Column({ type: "varchar", length: 10 })
  side!: "buy_up" | "buy_down" | "sell_up" | "sell_down";

  @Column({ type: "varchar", length: 20, default: "pending" })
  status!: "pending" | "filled" | "partial" | "cancelled" | "expired";

  @Column({ type: "varchar", length: 30 })
  expiresAtNs!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
