// 블랙북 서비스 설정. 아래 값을 본인 것으로 바꾸세요. (docs/SETUP-ko.md 의 단계 5, 6 참고)
// 여기에 넣어도 되는 값은 "공개 가능한" 값뿐이에요: Supabase 주소와 anon 키.
// Stripe 비밀 키, service_role 키 같은 비밀 값은 절대 이 파일에 넣지 마세요.
window.BB_CONFIG = {
  SUPABASE_URL: "https://YOUR_PROJECT_REF.supabase.co",
  SUPABASE_ANON_KEY: "YOUR_SUPABASE_ANON_KEY",
  TRIAL_DAYS: 14,
  PRICE_LABEL_KO: "2주 9,000원",
  PRICE_LABEL_EN: "9,000 KRW per 2 weeks",
  CONTACT_EMAIL: "you@example.com",
  // 사이트 맨 아래에 표시되는 사업자 정보 (비워 두면 표시하지 않아요. 통신판매업 신고 후 채우세요)
  BIZ_NAME: "",
  BIZ_OWNER: "",
  BIZ_REG: "",
  BIZ_MAILORDER: "",
  BIZ_ADDRESS: ""
};
