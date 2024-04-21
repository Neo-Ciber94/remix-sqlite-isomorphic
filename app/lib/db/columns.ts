import { customType, text } from "drizzle-orm/sqlite-core";

export function uuid(name: string) {
  return text(name).$defaultFn(() => crypto.randomUUID());
}

export const date = (name: string) => {
  return customType<{ data: Date; driverData: string }>({
    dataType() {
      return "text";
    },
    fromDriver(value) {
      return new Date(value);
    },
    toDriver(value) {
      return value.toISOString();
    },
  })(name);
};
