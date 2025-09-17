// [min, max]
export const randInt = (min: number, max: number): number => {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

// [min, max)
export const randFloat = (min: number, max: number): number => {
  return Math.random() * (max - min) + min;
};

export const degToRad = (deg: number): number => {
  return (deg * Math.PI) / 180;
};
