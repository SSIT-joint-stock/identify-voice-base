import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

@Injectable()
export class SearchUtil {
  parseSearchAge(search?: string) {
    if (!search || !/^-?\d+$/.test(search)) {
      return null;
    }

    const age = Number(search);
    const minInt = -2147483648;
    const maxInt = 2147483647;

    if (!Number.isSafeInteger(age) || age < minInt || age > maxInt) {
      return null;
    }

    return age;
  }

  parseSearchDateRange(search?: string): Prisma.DateTimeFilter | null {
    if (!search || !/^\d{4}-\d{2}-\d{2}$/.test(search)) {
      return null;
    }

    const start = new Date(`${search}T00:00:00.000Z`);
    if (Number.isNaN(start.getTime())) {
      return null;
    }

    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);

    return {
      gte: start,
      lt: end,
    };
  }

  isUuid(value?: string) {
    return Boolean(
      value?.match(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      ),
    );
  }
}
