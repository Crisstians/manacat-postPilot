import { Group, Image, Text } from "react-konva";
import { useMemo } from "react";
import dimensiuneIcon from "../../../assets/unitati/dimensiune.png";
import tipMaterialIcon from "../../../assets/unitati/tipMaterial.png";
import {
  createCanvasTextMeasurer,
  createEstimateTextMeasurer,
  layoutBottomRows,
} from "../../../services/layoutEngine";
import { buildParsedSize } from "../../../shared/sizeDisplay";
import type { TextBlock } from "../../../shared/types";
import { GARET_FONT, TEXT_GLOW, konvaFontStyle } from "./textStyles";
import { useKonvaImage } from "./useKonvaImage";

interface BottomRowsProps {
  sizeWidth?: string;
  sizeHeight?: string;
  featureText: string;
  sizeBlock: TextBlock;
  featureBlock: TextBlock;
  /** Când nu există dimensiune, ancorează caracteristica pe poziția dimensiunii. */
  anchorFeatureAtSize?: boolean;
}

export function BottomRows({
  sizeWidth = "",
  sizeHeight = "",
  featureText,
  sizeBlock,
  featureBlock,
  anchorFeatureAtSize = false,
}: BottomRowsProps) {
  const measure = useMemo(
    () => createCanvasTextMeasurer() ?? createEstimateTextMeasurer(),
    [],
  );
  const parsedSize = useMemo(() => buildParsedSize(sizeWidth, sizeHeight), [sizeWidth, sizeHeight]);
  const dimensionIcon = useKonvaImage(dimensiuneIcon);
  const materialIcon = useKonvaImage(tipMaterialIcon);

  const layout = useMemo(
    () =>
      layoutBottomRows(parsedSize, featureText, sizeBlock, featureBlock, measure, {
        anchorFeatureAtSize,
      }),
    [parsedSize, featureText, sizeBlock, featureBlock, measure, anchorFeatureAtSize],
  );

  return (
    <Group>
      {layout.size && dimensionIcon ? (
        <>
          <Image
            image={dimensionIcon}
            x={layout.size.icon.x}
            y={layout.size.icon.y}
            width={layout.size.icon.width}
            height={layout.size.icon.height}
            imageSmoothingEnabled
            shadowColor="#000000"
            shadowBlur={10}
            shadowOpacity={0.8}
          />
          {layout.size.segments.map((segment, index) => (
            <Text
              key={`size-segment-${index}`}
              x={segment.x}
              y={segment.y}
              text={segment.text}
              fontSize={segment.fontSize}
              fontFamily={GARET_FONT}
              fontStyle={konvaFontStyle(sizeBlock)}
              fill={sizeBlock.fill}
              lineHeight={sizeBlock.lineHeight}
              {...TEXT_GLOW}
            />
          ))}
        </>
      ) : null}

      {layout.feature && materialIcon ? (
        <>
          <Image
            image={materialIcon}
            x={layout.feature.icon.x}
            y={layout.feature.icon.y}
            width={layout.feature.icon.width}
            height={layout.feature.icon.height}
            imageSmoothingEnabled
            shadowColor="#000000"
            shadowBlur={10}
            shadowOpacity={0.8}
          />
          <Text
            x={layout.feature.text.x}
            y={layout.feature.text.y}
            text={layout.feature.text.text}
            fontSize={layout.feature.text.fontSize}
            fontFamily={GARET_FONT}
            fontStyle={konvaFontStyle(featureBlock)}
            fill={featureBlock.fill}
            lineHeight={featureBlock.lineHeight}
            {...TEXT_GLOW}
          />
        </>
      ) : null}
    </Group>
  );
}
