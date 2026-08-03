model Patient {
  id          String    @id @default(cuid())
  fullName    String
  age         Int
  dateOfBirth DateTime?
  ...
}

ALTER TABLE "Patient" ADD COLUMN "dateOfBirth" TIMESTAMP(3);