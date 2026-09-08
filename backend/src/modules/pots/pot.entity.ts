import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { TraderProfile } from "../traders/trader-profile.entity.js";
import { Epoch } from "../epochs/epoch.entity.js";

@Entity("pots")
export class Pot {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 20, default: "funded" })
  status!: "funded" | "trading" | "settled";

  @Column({ type: "uuid" })
  traderId!: string;

  @ManyToOne(() => TraderProfile, { onDelete: "CASCADE" })
  @JoinColumn({ name: "traderId" })
  trader!: TraderProfile;

  @Column({ type: "uuid" })
  epochId!: string;

  @ManyToOne(() => Epoch, { onDelete: "CASCADE" })
  @JoinColumn({ name: "epochId" })
  epoch!: Epoch;

  @Column({ type: "jsonb" })
  strategy!: {
    title: string;
    note: string;
    risk: "conservative" | "balanced" | "aggressive";
    focus: string[];
  };

  @Column({ type: "decimal", precision: 20, scale: 6, default: 0 })
  cash!: number;

  @Column({ type: "decimal", precision: 20, scale: 6, default: 0 })
  nav!: number;

  @Column({ type: "decimal", precision: 20, scale: 6, default: 0 })
  deployed!: number;

  @Column({ type: "decimal", precision: 10, scale: 6, default: 1 })
  lpPrice!: number;

  @Column({ type: "decimal", precision: 20, scale: 6, default: 0 })
  sharesOutstanding!: number;

  @Column({ type: "varchar", length: 42 })
  signerAddress!: string;

  @Column({ type: "int", default: 0 })
  signerIndex!: number;

  @Column({ type: "varchar", length: 42, nullable: true })
  vaultAddress!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
