// 블랙북 서비스 설정. 아래 값을 본인 것으로 바꾸세요. (docs/SETUP-ko.md 참고)
// 여기에 넣어도 되는 값은 "공개 가능한" 값뿐이에요: Supabase 주소와 anon 키, 토스페이먼츠 클라이언트 키.
// 토스페이먼츠 시크릿 키, Supabase service_role 키 같은 비밀 값은 절대 이 파일에 넣지 마세요.
window.BB_CONFIG = {
  SUPABASE_URL: "https://YOUR_PROJECT_REF.supabase.co",
  SUPABASE_ANON_KEY: "YOUR_SUPABASE_ANON_KEY",
  // 토스페이먼츠 "API 개별 연동 키"의 클라이언트 키 (test_ck_... 또는 live_ck_...). 결제위젯 키가 아니에요.
  TOSS_CLIENT_KEY: "YOUR_TOSS_CLIENT_KEY",
  TRIAL_DAYS: 14,
  // 표시용 문구. 실제 금액은 supabase/functions/_shared/clients.ts 의 PLANS 에서 정해요(두 곳을 같이 바꾸세요).
  PRICE_LABEL_KO: "30일 4,900원",
  PRICE_LABEL_EN: "4,900 KRW for 30 days",
  CONTACT_EMAIL: "you@example.com",
  // 사이트 맨 아래에 표시되는 사업자 정보 (비워 두면 표시하지 않아요. 통신판매업 신고 후 채우세요)
  BIZ_NAME: "",
  BIZ_OWNER: "",
  BIZ_REG: "",
  BIZ_MAILORDER: "",
  BIZ_ADDRESS: ""
};
