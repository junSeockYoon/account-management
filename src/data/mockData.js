/**
 * 사용자 자산·거래는 비어 있다.
 * 아래 목록은 입력 폼 선택지다. 카테고리 id는 supabase/schema.sql 과 같다.
 */

function todaySeoul() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());
}

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

function createInitialState() {
  return {
    asOf: todaySeoul(),
    profile: { name: '나' },
    fxRate: { base: 'KRW', USD: 1380.5, updatedAt: todaySeoul() },
    transactionTypes,
    expenseClasses,
    paymentMethods,
    categories,
    accounts: [],
    deposits: [],
    savings: [],
    stocks: [],
    cards: [],
    transactions: [],
  };
}

module.exports = { createInitialState };
