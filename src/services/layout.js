export const computeContainRect = ({ sourceWidth, sourceHeight, target, }) => {
    if (sourceWidth <= 0 || sourceHeight <= 0) {
        return target;
    }
    const sourceRatio = sourceWidth / sourceHeight;
    const targetRatio = target.width / target.height;
    if (sourceRatio > targetRatio) {
        const width = target.width;
        const height = width / sourceRatio;
        return {
            x: target.x,
            y: target.y + (target.height - height) / 2,
            width,
            height,
        };
    }
    const height = target.height;
    const width = height * sourceRatio;
    return {
        x: target.x + (target.width - width) / 2,
        y: target.y,
        width,
        height,
    };
};

export const computeCoverRect = ({ sourceWidth, sourceHeight, target, }) => {
    if (sourceWidth <= 0 || sourceHeight <= 0) {
        return target;
    }
    const sourceRatio = sourceWidth / sourceHeight;
    const targetRatio = target.width / target.height;
    if (sourceRatio > targetRatio) {
        const height = target.height;
        const width = height * sourceRatio;
        return {
            x: target.x + (target.width - width) / 2,
            y: target.y,
            width,
            height,
        };
    }
    const width = target.width;
    const height = width / sourceRatio;
    return {
        x: target.x,
        y: target.y + (target.height - height) / 2,
        width,
        height,
    };
};

/** Varianta `cover` ancorată în dreapta-jos (fără deformare, doar crop). */
export const computeCoverRectBottomRight = ({ sourceWidth, sourceHeight, target, }) => {
    if (sourceWidth <= 0 || sourceHeight <= 0) {
        return target;
    }
    const sourceRatio = sourceWidth / sourceHeight;
    const targetRatio = target.width / target.height;
    if (sourceRatio > targetRatio) {
        const height = target.height;
        const width = height * sourceRatio;
        return {
            x: target.x + (target.width - width),
            y: target.y,
            width,
            height,
        };
    }
    const width = target.width;
    const height = width / sourceRatio;
    return {
        x: target.x,
        y: target.y + (target.height - height),
        width,
        height,
    };
};

export const resolveProductImageRect = (sourceWidth, sourceHeight, target, override) => {
    if (override) {
        return override;
    }
    return computeContainRect({ sourceWidth, sourceHeight, target });
};
