import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { Pot } from "../pots/pot.entity.js";

@Entity("trades")
export class Trade {
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

  @Column({ type: "varchar", length: 10 })
  side!: "buy_up" | "buy_down" | "sell_up" | "sell_down";

  @Column({ type: "decimal", precision: 10, scale: 6 })
  price!: number;

  @Column({ type: "decimal", precision: 20, scale: 6 })
  quantity!: number;

  @Column({ type: "timestamptz" })
  ts!: Date;

  @CreateDateColumn()
  createdAt!: Date;
}
