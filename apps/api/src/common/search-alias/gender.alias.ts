import { UserGender } from '@prisma/client';

export const GENDER_ALIAS_MAP: Record<string, UserGender> = {
  male: UserGender.MALE,
  nam: UserGender.MALE,
  m: UserGender.MALE,

  female: UserGender.FEMALE,
  femaile: UserGender.FEMALE,
  nu: UserGender.FEMALE,
  'nu gioi': UserGender.FEMALE,
  f: UserGender.FEMALE,

  other: UserGender.OTHER,
  khac: UserGender.OTHER,
};
