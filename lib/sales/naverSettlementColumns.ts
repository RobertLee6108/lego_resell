export const NAVER_SETTLEMENT_IMPORT_SOURCE = "naver_smartstore_settlement";

export const NAVER_RETAILER_NAME = "네이버 스마트스토어";

export type SoldAtField = "payment" | "settlement" | "purchase_confirm";

export const SOLD_AT_FIELD_LABELS: Record<SoldAtField, string> = {
  payment: "결제일",
  settlement: "정산기준일",
  purchase_confirm: "구매확정일",
};

/** Header aliases → canonical field key (normalized: lowercase, no spaces) */
export const NAVER_COLUMN_ALIASES: Record<string, string[]> = {
  external_order_id: [
    "상품주문번호",
    "상품 주문번호",
    "productorderid",
  ],
  order_id: ["주문번호", "주문 번호", "orderid"],
  category: ["구분", "정산구분", "정산 구분"],
  settlement_status: ["정산상태", "정산 상태", "정산상태명"],
  seller_product_code: [
    "판매자상품코드",
    "판매자 상품코드",
    "판매자상품코드",
    "sellerproductcode",
  ],
  option_manage_code: [
    "옵션관리코드",
    "옵션 관리코드",
    "optionmanagecode",
  ],
  product_name: ["상품명", "상품 이름", "productname"],
  quantity: ["수량", "주문수량", "quantity"],
  payment_amount: [
    "결제금액",
    "결제 금액",
    "상품금액",
    "상품 금액",
    "판매금액",
    "paymentamount",
  ],
  fee_amount: [
    "수수료",
    "수수료합계",
    "수수료 합계",
    "판매수수료",
    "fee",
  ],
  settlement_amount: [
    "정산예정금액",
    "정산 예정금액",
    "정산금액",
    "정산 금액",
    "settlementamount",
  ],
  payment_date: ["결제일", "결제 일자", "paymentdate"],
  settlement_date: ["정산기준일", "정산 기준일", "settlementdate"],
  purchase_confirm_date: [
    "구매확정일",
    "구매 확정일",
    "purchaseconfirmdate",
  ],
};

export const EXCLUDED_CATEGORIES = new Set([
  "배송비",
  "혜택정산",
  "일별공제",
  "마이너스충전금",
]);

export const EXCLUDED_SETTLEMENT_STATUSES = new Set([
  "정산전취소",
  "취소",
  "반품",
  "반품완료",
  "교환",
  "교환완료",
]);
