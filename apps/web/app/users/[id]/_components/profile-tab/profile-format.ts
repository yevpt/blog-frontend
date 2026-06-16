export function getZodiac(birthday: string): string {
  const d = new Date(birthday);
  const m = d.getMonth() + 1;
  const day = d.getDate();
  if ((m === 3 && day >= 21) || (m === 4 && day <= 19)) return "白羊座";
  if ((m === 4 && day >= 20) || (m === 5 && day <= 20)) return "金牛座";
  if ((m === 5 && day >= 21) || (m === 6 && day <= 20)) return "双子座";
  if ((m === 6 && day >= 21) || (m === 7 && day <= 22)) return "巨蟹座";
  if ((m === 7 && day >= 23) || (m === 8 && day <= 22)) return "狮子座";
  if ((m === 8 && day >= 23) || (m === 9 && day <= 22)) return "处女座";
  if ((m === 9 && day >= 23) || (m === 10 && day <= 22)) return "天秤座";
  if ((m === 10 && day >= 23) || (m === 11 && day <= 21)) return "天蝎座";
  if ((m === 11 && day >= 22) || (m === 12 && day <= 21)) return "射手座";
  if ((m === 12 && day >= 22) || (m === 1 && day <= 19)) return "摩羯座";
  if ((m === 1 && day >= 20) || (m === 2 && day <= 18)) return "水瓶座";
  return "双鱼座";
}

export function getAge(birthday: string, referenceDate: Date = new Date()): number {
  const birth = new Date(birthday);
  let age = referenceDate.getFullYear() - birth.getFullYear();
  const monthDiff = referenceDate.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && referenceDate.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

export function formatRegisterAt(iso: string): string {
  try {
    return iso.replace("T", " ").slice(0, 19);
  } catch {
    return iso;
  }
}
