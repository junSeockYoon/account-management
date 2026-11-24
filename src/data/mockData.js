/**
 * PFM Mock Data
 * 기준일 2026-11-24. 거래 원장은 2026-06-01 ~ 2026-11-24 (6개월).
 *
 * 잔액·원금·누적액·평가액·카드 미결제액은 "현재 스냅샷"이다.
 * 아래 거래 내역을 다시 더해서 만든 값이 아니다.
 * 시드 거래는 이미 잔액에 반영된 과거 기록이고,
 * 이후 화면에서 추가하는 거래만 잔액/부채를 바꾼다.
 *
 * 토스 적금 accumulated(4,000,000)는 2026-01-25 개설 후
 * 1~10월 납입 10회분이다. 원장에는 6월 이후 이체만 있다.
 * 예금 평가액은 만기 전 원금 기준이다.
 *
 * 카드 미결제액은 11월 신용카드 사용액과 맞춘다.
 * (전월 청구분은 납부 완료, 이번 달 신용 사용분이 남아 있다고 가정)
 *
 * 앱에서는 createInitialState() 복사본만 수정한다.
 * 이 모듈이 export하는 시드는 얼려 두어 실수로 원본이 바뀌지 않게 했다.
 */

const AS_OF = '2026-11-24';

const profile = {
  name: '김민준',
};

const fxRate = {
  base: 'KRW',
  USD: 1380.5,
  updatedAt: AS_OF,
};

const transactionTypes = [
  { id: 'income', name: '수입' },
  { id: 'expense', name: '지출' },
  { id: 'transfer', name: '이체' },
];

const expenseClasses = [
  { id: 'fixed', name: '고정비' },
  { id: 'variable', name: '변동비' },
];

const paymentMethods = [
  { id: 'card', name: '카드' },
  { id: 'account', name: '계좌' },
  { id: 'cash', name: '현금' },
];

const categories = [
  { id: 'food', name: '식비', group: 'expense', color: '#4F46E5' },
  { id: 'cafe', name: '카페/간식', group: 'expense', color: '#8B5CF6' },
  { id: 'transport', name: '교통', group: 'expense', color: '#0EA5E9' },
  { id: 'living', name: '생활/마트', group: 'expense', color: '#14B8A6' },
  { id: 'shopping', name: '쇼핑', group: 'expense', color: '#F59E0B' },
  { id: 'leisure', name: '문화/여가', group: 'expense', color: '#EC4899' },
  { id: 'travel', name: '여행', group: 'expense', color: '#F97316' },
  { id: 'medical', name: '의료/건강', group: 'expense', color: '#10B981' },
  { id: 'telecom', name: '통신', group: 'expense', color: '#6366F1' },
  { id: 'housing', name: '주거/관리비', group: 'expense', color: '#64748B' },
  { id: 'subscription', name: '구독', group: 'expense', color: '#A855F7' },
  { id: 'insurance', name: '보험', group: 'expense', color: '#475569' },
  { id: 'ceremony', name: '경조사', group: 'expense', color: '#E11D48' },
  { id: 'education', name: '교육', group: 'expense', color: '#2563EB' },
  { id: 'salary', name: '급여', group: 'income', color: '#059669' },
  { id: 'interest', name: '이자', group: 'income', color: '#0D9488' },
  { id: 'other-income', name: '기타수입', group: 'income', color: '#34D399' },
  { id: 'transfer', name: '이체', group: 'transfer', color: '#94A3B8' },
];

/** 현금성 자산. kind: checking 입출금, parking 파킹, brokerage 증권 예수금 */
const accounts = [
  {
    id: 'acc-kb',
    bankName: '국민은행',
    name: '급여통장',
    kind: 'checking',
    balance: 4850000,
    currency: 'KRW',
    accountNumber: '123456-01-****89',
  },
  {
    id: 'acc-kakao',
    bankName: '카카오뱅크',
    name: '생활비 통장',
    kind: 'checking',
    balance: 1620000,
    currency: 'KRW',
    accountNumber: '3333-**-****21',
  },
  {
    id: 'acc-toss',
    bankName: '토스뱅크',
    name: '파킹통장',
    kind: 'parking',
    balance: 3240000,
    currency: 'KRW',
    accountNumber: '1000-****-8821',
  },
  {
    id: 'acc-kiwoom',
    bankName: '키움증권',
    name: '종합위탁 예수금',
    kind: 'brokerage',
    balance: 890000,
    currency: 'KRW',
    accountNumber: '5112-****-09',
  },
];

/** 안전자산 — 예금. 만기 전 평가액은 원금. */
const deposits = [
  {
    id: 'dep-kakao',
    bankName: '카카오뱅크',
    productName: '정기예금',
    principal: 10000000,
    annualRate: 3.5,
    openedAt: '2025-12-15',
    maturityDate: '2026-12-15',
  },
  {
    id: 'dep-shinhan',
    bankName: '신한은행',
    productName: '쏠편한 정기예금',
    principal: 5000000,
    annualRate: 3.2,
    openedAt: '2026-03-02',
    maturityDate: '2027-03-02',
  },
];

/** 안전자산 — 적금. accumulated는 현재 누적 납입액. */
const savings = [
  {
    id: 'sav-woori',
    bankName: '우리은행',
    productName: 'WON 적금',
    accumulated: 1200000,
    monthlyAmount: 200000,
    autoTransferDay: 5,
    autoTransferAccountId: 'acc-kb',
    openedAt: '2026-06-05',
    maturityDate: '2026-12-05',
  },
  {
    id: 'sav-kakao',
    bankName: '카카오뱅크',
    productName: '자유적금',
    accumulated: 1800000,
    monthlyAmount: 300000,
    autoTransferDay: 10,
    autoTransferAccountId: 'acc-kb',
    openedAt: '2026-06-10',
    maturityDate: '2026-12-10',
  },
  {
    id: 'sav-toss',
    bankName: '토스뱅크',
    productName: '키워봐요 적금',
    accumulated: 4000000,
    monthlyAmount: 400000,
    autoTransferDay: 25,
    autoTransferAccountId: 'acc-kb',
    openedAt: '2026-01-25',
    maturityDate: '2027-06-25',
  },
];

/**
 * 투자자산.
 * currentValue는 해당 통화 기준 총 평가액이며 화면에서 수동 수정할 수 있다.
 * 초기값은 quantity * currentPrice 와 같다.
 * 수익률은 같은 통화끼리 (currentValue - quantity * averagePrice) / 원가로 계산한다.
 */
const stocks = [
  {
    id: 'stk-005930',
    name: '삼성전자',
    ticker: '005930',
    market: 'KRX',
    quantity: 15,
    averagePrice: 68500,
    currentPrice: 79200,
    currentValue: 1188000,
    currency: 'KRW',
    priceUpdatedAt: AS_OF,
  },
  {
    id: 'stk-000660',
    name: 'SK하이닉스',
    ticker: '000660',
    market: 'KRX',
    quantity: 4,
    averagePrice: 185000,
    currentPrice: 212000,
    currentValue: 848000,
    currency: 'KRW',
    priceUpdatedAt: AS_OF,
  },
  {
    id: 'stk-035720',
    name: '카카오',
    ticker: '035720',
    market: 'KRX',
    quantity: 10,
    averagePrice: 52400,
    currentPrice: 41800,
    currentValue: 418000,
    currency: 'KRW',
    priceUpdatedAt: AS_OF,
  },
  {
    id: 'stk-069500',
    name: 'KODEX 200',
    ticker: '069500',
    market: 'KRX',
    quantity: 20,
    averagePrice: 36200,
    currentPrice: 38750,
    currentValue: 775000,
    currency: 'KRW',
    priceUpdatedAt: AS_OF,
  },
  {
    id: 'stk-aapl',
    name: 'Apple',
    ticker: 'AAPL',
    market: 'NASDAQ',
    quantity: 8,
    averagePrice: 175.4,
    currentPrice: 228.5,
    currentValue: 1828,
    currency: 'USD',
    priceUpdatedAt: AS_OF,
  },
  {
    id: 'stk-nvda',
    name: 'NVIDIA',
    ticker: 'NVDA',
    market: 'NASDAQ',
    quantity: 3,
    averagePrice: 118,
    currentPrice: 142.3,
    currentValue: 426.9,
    currency: 'USD',
    priceUpdatedAt: AS_OF,
  },
];

/**
 * 부채는 신용카드 unpaidAmount 합계.
 * 체크카드 미결제액은 0. 실적 기준액은 소비 리포트 달성률에 쓴다.
 * 11월 신용 사용액과 같은 값이다. 모듈 로드 시 검산한다.
 *   현대카드 401,800 / 삼성카드 237,800
 */
const cards = [
  {
    id: 'card-hyundai',
    issuer: '현대카드',
    name: 'M',
    type: 'credit',
    lastFour: '3312',
    linkedAccountId: null,
    unpaidAmount: 401800,
    performanceThreshold: 300000,
    paymentDay: 14,
  },
  {
    id: 'card-samsung',
    issuer: '삼성카드',
    name: 'iD ON',
    type: 'credit',
    lastFour: '5520',
    linkedAccountId: null,
    unpaidAmount: 237800,
    performanceThreshold: 300000,
    paymentDay: 12,
  },
  {
    id: 'card-shinhan',
    issuer: '신한카드',
    name: '딥드림 체크',
    type: 'debit',
    lastFour: '1108',
    linkedAccountId: 'acc-kb',
    unpaidAmount: 0,
    performanceThreshold: 200000,
    paymentDay: null,
  },
  {
    id: 'card-kakao',
    issuer: '카카오뱅크',
    name: '체크카드',
    type: 'debit',
    lastFour: '2241',
    linkedAccountId: 'acc-kakao',
    unpaidAmount: 0,
    performanceThreshold: 100000,
    paymentDay: null,
  },
];

const ACCOUNT_KEYS = {
  kb: 'acc-kb',
  kakaoBank: 'acc-kakao',
  toss: 'acc-toss',
  kiwoom: 'acc-kiwoom',
};

const CARD_KEYS = {
  hyundai: 'card-hyundai',
  samsung: 'card-samsung',
  shinhan: 'card-shinhan',
  kakao: 'card-kakao',
};

const MONTHS = ['2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11'];

function iso(month, day) {
  return `${month}-${String(day).padStart(2, '0')}`;
}

function recurring(month) {
  return [
    [iso(month, 1), 'income', 7800, 'income:toss', 'interest', null, '토스파킹 이자'],
    [iso(month, 1), 'expense', 65000, 'shinhan', 'transport', 'fixed', '기후동행카드'],
    [iso(month, 3), 'expense', 69000, 'hyundai', 'telecom', 'fixed', 'SKT 통신비'],
    [iso(month, 3), 'expense', 17000, 'samsung', 'subscription', 'fixed', '넷플릭스'],
    [iso(month, 3), 'expense', 14900, 'samsung', 'subscription', 'fixed', '유튜브 프리미엄'],
    [iso(month, 5), 'expense', 185000, 'kb', 'housing', 'fixed', '아파트 관리비'],
    [iso(month, 5), 'transfer', 200000, 'from:kb>savings:sav-woori', 'transfer', null, '우리 WON 적금'],
    [iso(month, 10), 'transfer', 300000, 'from:kb>savings:sav-kakao', 'transfer', null, '카카오 자유적금'],
    [iso(month, 15), 'expense', 128000, 'kb', 'insurance', 'fixed', '실손·건강보험료'],
    [iso(month, 25), 'income', 4250000, 'income:kb', 'salary', null, '월급'],
    [iso(month, 25), 'transfer', 400000, 'from:kb>savings:sav-toss', 'transfer', null, '토스 키워봐요 적금'],
  ].filter((row) => row[0] <= AS_OF);
}

function routineExpenses(month) {
  const [yearText, monthText] = month.split('-');
  const year = Number(yearText);
  const monthNumber = Number(monthText);
  const lastDay = new Date(year, monthNumber, 0).getDate();
  const skipDays = month === '2026-08' ? new Set([13, 14, 15, 16]) : new Set();
  const lunchMemos = ['구내식당', '김밥천국', '백반', '덮밥', '국수', '도시락', '비빔밥', '제육볶음'];
  const lunchPrices = [8500, 9000, 9500, 10000, 11000, 12000, 7800, 13500];
  const cafePrices = [4500, 5100, 5800, 6300, 7200];
  const cafeMemos = ['아메리카노', '아이스 라떼', '카페 모카', '콜드브루'];
  const rows = [];

  for (let day = 1; day <= lastDay; day += 1) {
    const date = iso(month, day);
    if (date > AS_OF) break;
    if (skipDays.has(day)) continue;

    const weekday = new Date(year, monthNumber - 1, day).getDay();
    if (weekday === 0 || weekday === 6) continue;

    const skipLunch = date !== AS_OF && (day + monthNumber) % 5 === 0;
    if (!skipLunch) {
      const amount = lunchPrices[(day + monthNumber) % lunchPrices.length];
      const memo = lunchMemos[(day + monthNumber) % lunchMemos.length];
      rows.push([date, 'expense', amount, 'shinhan', 'food', 'variable', `점심 · ${memo}`]);
    }

    if (weekday === 2 || weekday === 5) {
      rows.push([
        date,
        'expense',
        cafePrices[(day + monthNumber) % cafePrices.length],
        weekday === 2 ? 'hyundai' : 'kakao',
        'cafe',
        'variable',
        cafeMemos[day % cafeMemos.length],
      ]);
    }
  }

  return rows;
}

function livingExpenses(month) {
  const monthNumber = Number(month.slice(5));
  return [
    [iso(month, 6), 'expense', 54000 + monthNumber * 1200, 'shinhan', 'living', 'variable', '이마트 장보기'],
    [iso(month, 11), 'expense', 28000 + monthNumber * 900, 'samsung', 'living', 'variable', '쿠팡 생필품'],
    [iso(month, 14), 'expense', 4200 + (monthNumber % 3) * 500, 'hyundai', 'living', 'variable', '편의점'],
    [iso(month, 20), 'expense', 46000 + monthNumber * 800, 'shinhan', 'living', 'variable', '홈플러스'],
    [iso(month, 27), 'expense', 6100, 'hyundai', 'living', 'variable', '편의점'],
  ].filter((row) => row[0] <= AS_OF);
}

/** 달마다 반복되지 않는 지출·이체·기타수입 */
const highlights = [
  ['2026-06-08', 'expense', 67000, 'samsung', 'shopping', 'variable', '무신사 티셔츠'],
  ['2026-06-10', 'expense', 56800, 'samsung', 'transport', 'variable', 'KTX 서울-부산 왕복'],
  ['2026-06-11', 'expense', 36000, 'hyundai', 'food', 'variable', '삼겹살 저녁'],
  ['2026-06-13', 'expense', 26000, 'hyundai', 'leisure', 'variable', 'CGV 영화'],
  ['2026-06-16', 'expense', 29800, 'hyundai', 'food', 'variable', '배달의민족 치킨'],
  ['2026-06-17', 'expense', 149000, 'samsung', 'education', 'variable', '온라인 강의'],
  ['2026-06-18', 'expense', 38000, 'hyundai', 'food', 'variable', '팀 저녁'],
  ['2026-06-19', 'expense', 89000, 'hyundai', 'medical', 'variable', '안경·렌즈'],
  ['2026-06-21', 'expense', 129000, 'hyundai', 'shopping', 'variable', '나이키 운동화'],
  ['2026-06-24', 'expense', 21000, 'samsung', 'leisure', 'variable', '교보문고'],
  ['2026-06-25', 'expense', 72000, 'hyundai', 'food', 'variable', '가족 외식'],
  ['2026-06-26', 'transfer', 1000000, 'from:kb>account:acc-toss', 'transfer', null, '파킹통장으로 이동'],

  ['2026-07-04', 'expense', 118000, 'samsung', 'shopping', 'variable', '유니클로 여름 옷'],
  ['2026-07-11', 'expense', 42000, 'hyundai', 'food', 'variable', '회식 개인 부담'],
  ['2026-07-18', 'expense', 132000, 'samsung', 'leisure', 'variable', '콘서트 티켓'],
  ['2026-07-19', 'expense', 54000, 'hyundai', 'shopping', 'variable', '콘서트 굿즈'],
  ['2026-07-19', 'expense', 47000, 'hyundai', 'food', 'variable', '콘서트 뒤 저녁'],
  ['2026-07-25', 'expense', 68000, 'hyundai', 'food', 'variable', '월급날 외식'],
  ['2026-07-28', 'expense', 86400, 'kakao', 'living', 'variable', '코스트코'],

  ['2026-08-13', 'expense', 214000, 'samsung', 'travel', 'variable', '제주 왕복 항공'],
  ['2026-08-13', 'expense', 286000, 'hyundai', 'travel', 'variable', '제주 숙소 2박'],
  ['2026-08-14', 'expense', 92000, 'samsung', 'travel', 'variable', '렌터카'],
  ['2026-08-14', 'expense', 68000, 'hyundai', 'food', 'variable', '흑돼지'],
  ['2026-08-15', 'expense', 18000, 'cash:kb', 'food', 'variable', '제주 전통시장'],
  ['2026-08-15', 'expense', 47000, 'kakao', 'shopping', 'variable', '기념품·카페'],
  ['2026-08-16', 'expense', 24000, 'shinhan', 'food', 'variable', '공항 식사'],
  ['2026-08-22', 'expense', 53000, 'hyundai', 'leisure', 'variable', '전시 관람'],
  ['2026-08-29', 'expense', 64000, 'hyundai', 'food', 'variable', '가족 외식'],

  ['2026-09-08', 'expense', 145000, 'kb', 'medical', 'variable', '종합검진'],
  ['2026-09-12', 'expense', 23000, 'cash:kb', 'living', 'variable', '전통시장'],
  ['2026-09-19', 'expense', 76000, 'samsung', 'shopping', 'variable', '가을 자켓'],
  ['2026-09-26', 'transfer', 500000, 'from:toss>account:acc-kiwoom', 'transfer', null, '증권계좌 입금'],
  ['2026-09-27', 'expense', 100000, 'cash:kb', 'ceremony', 'variable', '친구 결혼 축의금'],
  ['2026-09-27', 'expense', 58000, 'hyundai', 'food', 'variable', '결혼식 전 모임'],
  ['2026-09-30', 'income', 45000, 'income:kakaoBank', 'other-income', null, '중고 판매'],

  ['2026-10-02', 'transfer', 800000, 'from:kb>account:acc-kakao', 'transfer', null, '생활비 계좌 이체'],
  ['2026-10-12', 'expense', 198000, 'samsung', 'shopping', 'variable', '겨울 코트'],
  ['2026-10-17', 'expense', 36000, 'hyundai', 'leisure', 'variable', '뮤지컬'],
  ['2026-10-18', 'expense', 52000, 'hyundai', 'food', 'variable', '주말 외식'],
  ['2026-10-22', 'expense', 88000, 'hyundai', 'medical', 'variable', '치과 스케일링'],
  ['2026-10-26', 'expense', 43000, 'hyundai', 'food', 'variable', '월급날 저녁'],
  ['2026-10-28', 'expense', 76000, 'hyundai', 'shopping', 'variable', '겨울 니트'],

  ['2026-11-06', 'expense', 27800, 'hyundai', 'shopping', 'variable', '올리브영'],
  ['2026-11-07', 'expense', 28000, 'hyundai', 'leisure', 'variable', '영화'],
  ['2026-11-09', 'expense', 23400, 'hyundai', 'food', 'variable', '배달 저녁'],
  ['2026-11-10', 'expense', 18400, 'hyundai', 'transport', 'variable', '택시'],
  ['2026-11-10', 'expense', 46000, 'hyundai', 'food', 'variable', '삼겹살'],
  ['2026-11-11', 'expense', 89000, 'samsung', 'shopping', 'variable', '무신사'],
  ['2026-11-13', 'expense', 22000, 'shinhan', 'medical', 'variable', '내과 진료'],
  ['2026-11-13', 'expense', 8600, 'shinhan', 'medical', 'variable', '약국'],
  ['2026-11-16', 'expense', 34000, 'hyundai', 'food', 'variable', '브런치'],
  ['2026-11-19', 'expense', 79000, 'samsung', 'shopping', 'variable', '유니클로'],
  ['2026-11-19', 'expense', 42000, 'hyundai', 'food', 'variable', '회식'],
  ['2026-11-21', 'expense', 35000, 'hyundai', 'living', 'variable', '미용실'],
  ['2026-11-22', 'expense', 31000, 'hyundai', 'food', 'variable', '치킨 배달'],
  ['2026-11-23', 'expense', 18900, 'hyundai', 'leisure', 'variable', '서점'],
];

function resolveSource(source) {
  if (source.startsWith('from:')) {
    const [fromKey, target] = source.slice(5).split('>');
    const [toAssetType, toAssetId] = target.split(':');
    return {
      paymentMethod: 'account',
      cardId: null,
      accountId: ACCOUNT_KEYS[fromKey],
      toAssetType,
      toAssetId,
    };
  }

  if (source.startsWith('income:')) {
    return {
      paymentMethod: 'account',
      cardId: null,
      accountId: ACCOUNT_KEYS[source.slice(7)],
      toAssetType: null,
      toAssetId: null,
    };
  }

  if (source.startsWith('cash:')) {
    return {
      paymentMethod: 'cash',
      cardId: null,
      accountId: ACCOUNT_KEYS[source.slice(5)],
      toAssetType: null,
      toAssetId: null,
    };
  }

  if (CARD_KEYS[source]) {
    return {
      paymentMethod: 'card',
      cardId: CARD_KEYS[source],
      accountId: null,
      toAssetType: null,
      toAssetId: null,
    };
  }

  if (ACCOUNT_KEYS[source]) {
    return {
      paymentMethod: 'account',
      cardId: null,
      accountId: ACCOUNT_KEYS[source],
      toAssetType: null,
      toAssetId: null,
    };
  }

  throw new Error(`알 수 없는 결제 출처: ${source}`);
}

function buildTransactions() {
  const raw = [];
  MONTHS.forEach((month) => {
    raw.push(...recurring(month), ...routineExpenses(month), ...livingExpenses(month));
  });
  raw.push(...highlights);

  const typeOrder = { income: 0, transfer: 1, expense: 2 };
  raw.sort((a, b) => {
    if (a[0] !== b[0]) return a[0] < b[0] ? -1 : 1;
    if (typeOrder[a[1]] !== typeOrder[b[1]]) return typeOrder[a[1]] - typeOrder[b[1]];
    if (a[2] !== b[2]) return b[2] - a[2];
    return a[6].localeCompare(b[6], 'ko');
  });

  return raw.map((row, index) => {
    const [date, type, amount, source, categoryId, expenseClass, memo] = row;
    const payment = resolveSource(source);
    return {
      id: `tx-${String(index + 1).padStart(4, '0')}`,
      date,
      type,
      amount,
      paymentMethod: payment.paymentMethod,
      cardId: payment.cardId,
      accountId: payment.accountId,
      toAssetType: payment.toAssetType,
      toAssetId: payment.toAssetId,
      categoryId,
      expenseClass,
      memo,
    };
  });
}

const transactions = buildTransactions();

function assertIntegrity() {
  const categoryIds = new Set(categories.map((category) => category.id));
  const accountIds = new Set(accounts.map((account) => account.id));
  const savingsIds = new Set(savings.map((item) => item.id));
  const cardIds = new Set(cards.map((card) => card.id));
  const seen = new Set();

  accounts.forEach((account) => {
    if (!Number.isInteger(account.balance) || account.balance < 0) {
      throw new Error(`계좌 잔액이 올바르지 않습니다: ${account.id}`);
    }
  });

  stocks.forEach((stock) => {
    const expected = Number((stock.quantity * stock.currentPrice).toFixed(2));
    if (expected !== stock.currentValue) {
      throw new Error(`${stock.ticker} 평가액이 수량×현재가와 다릅니다`);
    }
  });

  cards.forEach((card) => {
    if (card.type === 'debit' && !accountIds.has(card.linkedAccountId)) {
      throw new Error(`체크카드 연결 계좌가 없습니다: ${card.id}`);
    }
    if (card.type === 'credit' && card.linkedAccountId) {
      throw new Error(`신용카드에 연결 계좌가 있습니다: ${card.id}`);
    }
  });

  savings.forEach((item) => {
    if (!accountIds.has(item.autoTransferAccountId)) {
      throw new Error(`적금 자동이체 계좌가 없습니다: ${item.id}`);
    }
  });

  transactions.forEach((tx) => {
    if (seen.has(tx.id)) throw new Error(`중복 거래 id: ${tx.id}`);
    seen.add(tx.id);
    if (tx.date > AS_OF) throw new Error(`기준일 이후 거래: ${tx.id}`);
    if (!categoryIds.has(tx.categoryId)) throw new Error(`없는 카테고리: ${tx.id}`);
    if (!Number.isInteger(tx.amount) || tx.amount <= 0) throw new Error(`금액 오류: ${tx.id}`);

    if (tx.type === 'expense' && tx.expenseClass !== 'fixed' && tx.expenseClass !== 'variable') {
      throw new Error(`지출 고정/변동 구분이 없습니다: ${tx.id}`);
    }
    if (tx.type !== 'expense' && tx.expenseClass != null) {
      throw new Error(`지출이 아닌 거래에 고정/변동 구분이 있습니다: ${tx.id}`);
    }
    if (tx.cardId && !cardIds.has(tx.cardId)) throw new Error(`없는 카드: ${tx.id}`);
    if (tx.accountId && !accountIds.has(tx.accountId)) throw new Error(`없는 계좌: ${tx.id}`);

    if (tx.type === 'transfer') {
      if (!tx.accountId || !tx.toAssetId) throw new Error(`이체 계좌가 없습니다: ${tx.id}`);
      const targetIds = tx.toAssetType === 'savings' ? savingsIds : accountIds;
      if (!targetIds.has(tx.toAssetId)) throw new Error(`이체 대상이 없습니다: ${tx.id}`);
    }
  });

  const novemberCredit = { 'card-hyundai': 0, 'card-samsung': 0 };
  transactions.forEach((tx) => {
    if (tx.type === 'expense' && tx.date.startsWith('2026-11') && novemberCredit[tx.cardId] != null) {
      novemberCredit[tx.cardId] += tx.amount;
    }
  });
  const mismatches = [];
  cards.forEach((card) => {
    if (card.type === 'credit' && card.unpaidAmount !== novemberCredit[card.id]) {
      mismatches.push(`${card.id} ${card.unpaidAmount} ≠ ${novemberCredit[card.id]}`);
    }
  });
  if (mismatches.length) throw new Error(mismatches.join(' | '));
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.keys(value).forEach((key) => deepFreeze(value[key]));
  return Object.freeze(value);
}

assertIntegrity();

const seed = {
  asOf: AS_OF,
  profile,
  fxRate,
  transactionTypes,
  expenseClasses,
  paymentMethods,
  categories,
  accounts,
  deposits,
  savings,
  stocks,
  cards,
  transactions,
};

deepFreeze(seed);

function createInitialState() {
  return JSON.parse(JSON.stringify(seed));
}

module.exports = {
  ...seed,
  createInitialState,
};
