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

@Entity("pot_shares")
export class PotShare {
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

  @Column({ type: "decimal", precision: 20, scale: 6, default: 0 })
  shares!: number;

  @Column({ type: "decimal", precision: 20, scale: 6, default: 0 })
  investedUsd!: number;

  @Column({ type: "decimal", precision: 20, scale: 6, default: 0 })
  claimableUsd!: number;

  @CreateDateColumn()
  createdAt!: Date;
}
