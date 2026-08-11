export type QuoteCurrency = 'RMB' | 'USD' | 'NGN';

export type QuotationSourceAsset = {
  name: string;
  mimeType: string;
  kind: 'image' | 'pdf';
  url: string;
  previewUrl: string | null;
  publicId: string;
  resourceType: string;
  bytes: number;
};

export type QuoteProduct = {
  id: string;
  name: string;
  description: string;
  unitPrice: number;
  currency: QuoteCurrency;
  quantity: number;
  unitWeightKg: number | null;
  totalWeightKg: number | null;
  unitsPerCarton: number | null;
  cartonLengthCm: number | null;
  cartonWidthCm: number | null;
  cartonHeightCm: number | null;
  totalCbm: number | null;
  domesticTransportCost: number;
  domesticTransportCurrency: QuoteCurrency;
  notes: string;
  imageSourceIndex: number | null;
};

export type QuotationRateSnapshot = {
  ngnPerUsd: number;
  ngnPerCny: number;
  cnyPerUsd: number;
  serviceChargePercent: number;
  vatPercent: number;
  airRateUsdPerKg: number;
  seaRateNgnPerCbm: number;
  airPlanId: string;
  airPlanName: string;
  destinationCountry: string;
  deliveryPoint: string;
};

export type QuoteBuildInput = {
  customerName: string;
  customerLocation: string;
  title: string;
  introduction: string;
  products: QuoteProduct[];
  sourceAssets: QuotationSourceAsset[];
  rates: QuotationRateSnapshot;
  includeSea: boolean;
  includeAir: boolean;
  maxPages: number;
  additionalNotes: string;
};

export type CalculatedQuoteLine = QuoteProduct & {
  convertedUnitPriceNgn: number;
  productCostNgn: number;
  domesticTransportNgn: number;
  serviceChargeNgn: number;
  vatNgn: number;
  subtotalBeforeShippingNgn: number;
  calculatedWeightKg: number;
  calculatedCbm: number;
};

export type CalculatedQuote = {
  lines: CalculatedQuoteLine[];
  productCostNgn: number;
  domesticTransportNgn: number;
  serviceChargeNgn: number;
  vatNgn: number;
  subtotalBeforeShippingNgn: number;
  totalWeightKg: number;
  totalCbm: number;
  airShippingNgn: number;
  seaShippingNgn: number;
  landedByAirNgn: number;
  landedBySeaNgn: number;
};
