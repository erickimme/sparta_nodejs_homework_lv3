export function parseModelToFlatObject(model) {
  let obj = {};

  // 첫 번째 레벨의 키-값을 대상 객체에 복사합니다.
  Object.entries(model).forEach(([key, value]) => {
    if (typeof value === 'object' && !(value instanceof Date)) {
      // 두 번째 레벨의 키-값도 대상 객체에 복사합니다.
      Object.entries(value).forEach(([subKey, subValue]) => {
        obj[subKey] = subValue;
      });
    } else {
      obj[key] = value;
    }
  });
  return obj;
}
