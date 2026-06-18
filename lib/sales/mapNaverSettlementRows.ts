import type { SoldAtField } from "@/lib/sales/naverSettlementColumns";
import {
  buildMemo,
  calcPlatformFeeRate,
  resolveSoldAt,
} from "@/lib/sales/naverSettlementTypes";
import type {
  NaverParsedRow,
  NaverPreviewRow,
} from "@/lib/sales/naverSettlementTypes";

interface ProductOption {
  product_number: string;
  name: string;
}

function matchProductNumber(
  row: NaverParsedRow,
  productSet: Set<string>,
): { product_number: string; match_source: "seller_code" | "option_code" } | null {
  const seller = row.seller_product_code?.trim();
  if (seller && productSet.has(seller)) {
    return { product_number: seller, match_source: "seller_code" };
  }

  const option = row.option_manage_code?.trim();
  if (option && productSet.has(option)) {
    return { product_number: option, match_source: "option_code" };
  }

  return null;
}

export function mapNaverSettlementRows(
  parsedRows: NaverParsedRow[],
  products: ProductOption[],
  soldAtField: SoldAtField,
  existingExternalIds: Set<string>,
  manualMappings: Record<number, string> = {},
): NaverPreviewRow[] {
  const productSet = new Set(products.map((p) => p.product_number));

  return parsedRows.map((row) => {
    const soldAt = resolveSoldAt(row, soldAtField);
    const platformFeeRate = calcPlatformFeeRate(row.payment_amount, row.fee_amount);
    const unitSalePrice = Math.round(row.payment_amount / row.quantity);
    const memo = buildMemo(row.external_order_id, row.product_name);

    if (existingExternalIds.has(row.external_order_id)) {
      return {
        rowIndex: row.rowIndex,
        external_order_id: row.external_order_id,
        product_name: row.product_name,
        payment_amount: row.payment_amount,
        fee_amount: row.fee_amount,
        platform_fee_rate: platformFeeRate,
        quantity: row.quantity,
        unit_sale_price: unitSalePrice,
        sold_at: soldAt ?? "",
        product_number: null,
        match_source: null,
        status: "duplicate",
        error_message: "이미 등록된 상품주문번호입니다.",
        memo,
      };
    }

    if (!soldAt) {
      return {
        rowIndex: row.rowIndex,
        external_order_id: row.external_order_id,
        product_name: row.product_name,
        payment_amount: row.payment_amount,
        fee_amount: row.fee_amount,
        platform_fee_rate: platformFeeRate,
        quantity: row.quantity,
        unit_sale_price: unitSalePrice,
        sold_at: "",
        product_number: null,
        match_source: null,
        status: "error",
        error_message: "판매일을 확인할 수 없습니다.",
        memo,
      };
    }

    const manual = manualMappings[row.rowIndex]?.trim();
    if (manual) {
      if (!productSet.has(manual)) {
        return {
          rowIndex: row.rowIndex,
          external_order_id: row.external_order_id,
          product_name: row.product_name,
          payment_amount: row.payment_amount,
          fee_amount: row.fee_amount,
          platform_fee_rate: platformFeeRate,
          quantity: row.quantity,
          unit_sale_price: unitSalePrice,
          sold_at: soldAt,
          product_number: null,
          match_source: null,
          status: "error",
          error_message: "선택한 제품이 카탈로그에 없습니다.",
          memo,
        };
      }

      return {
        rowIndex: row.rowIndex,
        external_order_id: row.external_order_id,
        product_name: row.product_name,
        payment_amount: row.payment_amount,
        fee_amount: row.fee_amount,
        platform_fee_rate: platformFeeRate,
        quantity: row.quantity,
        unit_sale_price: unitSalePrice,
        sold_at: soldAt,
        product_number: manual,
        match_source: "manual",
        status: "ready",
        error_message: null,
        memo,
      };
    }

    const auto = matchProductNumber(row, productSet);
    if (!auto) {
      return {
        rowIndex: row.rowIndex,
        external_order_id: row.external_order_id,
        product_name: row.product_name,
        payment_amount: row.payment_amount,
        fee_amount: row.fee_amount,
        platform_fee_rate: platformFeeRate,
        quantity: row.quantity,
        unit_sale_price: unitSalePrice,
        sold_at: soldAt,
        product_number: null,
        match_source: null,
        status: "unmatched",
        error_message: "판매자상품코드·옵션관리코드로 제품을 찾을 수 없습니다.",
        memo,
      };
    }

    return {
      rowIndex: row.rowIndex,
      external_order_id: row.external_order_id,
      product_name: row.product_name,
      payment_amount: row.payment_amount,
      fee_amount: row.fee_amount,
      platform_fee_rate: platformFeeRate,
      quantity: row.quantity,
      unit_sale_price: unitSalePrice,
      sold_at: soldAt,
      product_number: auto.product_number,
      match_source: auto.match_source,
      status: "ready",
      error_message: null,
      memo,
    };
  });
}
