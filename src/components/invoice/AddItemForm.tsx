import React from "react";
import { View } from "react-native";
import type { ThemeColors } from "@packages/theme";
import { ProductFormCard } from "@/src/components/shared/ProductFormCard";
import type { ProductFormData } from "@/src/components/shared/ProductFormCard";

interface Props {
  theme: ThemeColors;
  desc: string;
  qty: string;
  unit: string;
  unitPrice: string;
  ean: string;
  ncm: string;
  onDescChange: (v: string) => void;
  onQtyChange: (v: string) => void;
  onUnitChange: (v: string) => void;
  onUnitPriceChange: (v: string) => void;
  onEanChange: (v: string) => void;
  onNcmChange: (v: string) => void;
  onConfirm: () => void;
  categoryId?: string;
  onCategoryChange?: (catId: string, subCatId?: string) => void;
}

export function AddItemForm({
  theme,
  desc,
  qty,
  unit,
  unitPrice,
  ean,
  ncm,
  onDescChange,
  onQtyChange,
  onUnitChange,
  onUnitPriceChange,
  onEanChange,
  onNcmChange,
  onConfirm,
  categoryId = "alimentacao",
  onCategoryChange,
}: Props) {
  const data: ProductFormData = {
    name: desc,
    qty,
    unit,
    unitPrice,
    categoryId,
    ean,
    ncm,
  };

  const handleChange = (field: keyof ProductFormData, value: string) => {
    switch (field) {
      case "name": onDescChange(value); break;
      case "qty": onQtyChange(value); break;
      case "unit": onUnitChange(value); break;
      case "unitPrice": onUnitPriceChange(value); break;
      case "ean": onEanChange(value); break;
      case "ncm": onNcmChange(value); break;
      case "categoryId": onCategoryChange?.(value); break;
    }
  };

  return (
    <View style={{ marginBottom: 12 }}>
      <ProductFormCard
        data={data}
        onChange={handleChange}
        theme={theme}
        namePlaceholder="Descricao do produto"
        showConfirm
        onConfirm={onConfirm}
      />
    </View>
  );
}
