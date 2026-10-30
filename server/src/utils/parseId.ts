export const parseId = (idParam: string | string[]): number | null => {
  if (typeof idParam !== "string") return null;
  const id = Number(idParam);
  if (!Number.isInteger(id) || id <= 0) return null;
  return id;
};
