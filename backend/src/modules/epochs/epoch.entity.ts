import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from "typeorm";

@Entity("epochs")
export class Epoch {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "int" })
  number!: number;

  @Column({ type: "timestamptz" })
  startsAt!: Date;

  @Column({ type: "timestamptz" })
  endsAt!: Date;

  @Column({ type: "varchar", length: 20, default: "upcoming" })
  status!: "upcoming" | "live" | "settling" | "settled";

  @Column({ type: "int", default: 0 })
  potCount!: number;

  @Column({ type: "decimal", precision: 20, scale: 2, default: 0 })
  tvl!: number;

  @CreateDateColumn()
  createdAt!: Date;
}
