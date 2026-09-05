import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { User } from "../auth/user.entity.js";
import { Pot } from "../pots/pot.entity.js";

@Entity("withdrawals")
export class Withdrawal {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid" })
  userId!: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user!: User;

  @Column({ type: "uuid" })
  potId!: string;

  @ManyToOne(() => Pot, { onDelete: "CASCADE" })
  @JoinColumn({ name: "potId" })
  pot!: Pot;

  @Column({ type: "decimal", precision: 20, scale: 6 })
  amountUsd!: number;

  @Column({ type: "varchar", length: 66, nullable: true })
  txHash?: string;

  @Column({ type: "varchar", length: 20, default: "pending" })
  status!: "pending" | "completed" | "failed";

  @CreateDateColumn()
  createdAt!: Date;
}
