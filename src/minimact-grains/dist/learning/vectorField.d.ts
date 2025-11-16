/**
 * Vector Field Operations
 *
 * Core mathematical operations for vector fields in grains.
 * These enable spatial probability networks through similarity metrics.
 */
/**
 * Cosine Similarity
 *
 * Measures similarity between two vectors in [-1, 1] range.
 * - 1.0 = identical direction
 * - 0.0 = orthogonal
 * - -1.0 = opposite direction
 *
 * This is the CORE of spatial probability routing!
 * Grains navigate toward other grains with similar vector fields.
 *
 * @param vecA - First vector
 * @param vecB - Second vector
 * @returns Similarity score in [-1, 1]
 *
 * @example
 * ```ts
 * const similarity = cosineSimilarity([1, 0, 0], [0, 1, 0]);
 * // Returns 0 (orthogonal vectors)
 *
 * const similarity2 = cosineSimilarity([1, 2, 3], [2, 4, 6]);
 * // Returns 1.0 (parallel vectors)
 * ```
 */
export declare function cosineSimilarity(vecA: number[], vecB: number[]): number;
/**
 * Euclidean Distance
 *
 * Measures straight-line distance between two vectors.
 * Lower = more similar.
 *
 * @param vecA - First vector
 * @param vecB - Second vector
 * @returns Distance (non-negative)
 *
 * @example
 * ```ts
 * const distance = euclideanDistance([0, 0], [3, 4]);
 * // Returns 5.0 (3-4-5 triangle)
 * ```
 */
export declare function euclideanDistance(vecA: number[], vecB: number[]): number;
/**
 * Normalize Vector
 *
 * Scales vector to unit length (magnitude = 1).
 * Useful for comparing directions independent of magnitude.
 *
 * @param vec - Vector to normalize
 * @returns Normalized vector (unit length)
 *
 * @example
 * ```ts
 * const normalized = normalizeVector([3, 4]);
 * // Returns [0.6, 0.8] (magnitude = 1)
 * ```
 */
export declare function normalizeVector(vec: number[]): number[];
/**
 * Tune Vector Field
 *
 * Gradually adjusts current field toward target field.
 * This is how Hebbian learning emerges - fields that fire together
 * get tuned toward each other!
 *
 * @param currentField - Current vector field
 * @param targetField - Target vector field (reward direction)
 * @param learningRate - How fast to adjust (0-1), default 0.1
 * @returns Updated vector field
 *
 * @example
 * ```ts
 * let field = [1, 0, 0];
 * const target = [0, 1, 0];
 *
 * // Over multiple updates, field gradually points toward target
 * field = tuneVectorField(field, target, 0.1);
 * field = tuneVectorField(field, target, 0.1);
 * field = tuneVectorField(field, target, 0.1);
 * // field now closer to [0, 1, 0]
 * ```
 */
export declare function tuneVectorField(currentField: number[], targetField: number[], learningRate?: number): number[];
/**
 * Dot Product
 *
 * Projects one vector onto another.
 * Used internally by cosine similarity.
 *
 * @param vecA - First vector
 * @param vecB - Second vector
 * @returns Dot product
 */
export declare function dotProduct(vecA: number[], vecB: number[]): number;
/**
 * Vector Magnitude
 *
 * Computes the length of a vector.
 *
 * @param vec - Vector
 * @returns Magnitude (length)
 */
export declare function magnitude(vec: number[]): number;
/**
 * Add Vectors
 *
 * Element-wise vector addition.
 *
 * @param vecA - First vector
 * @param vecB - Second vector
 * @returns Sum vector
 */
export declare function addVectors(vecA: number[], vecB: number[]): number[];
/**
 * Subtract Vectors
 *
 * Element-wise vector subtraction.
 *
 * @param vecA - First vector
 * @param vecB - Second vector
 * @returns Difference vector
 */
export declare function subtractVectors(vecA: number[], vecB: number[]): number[];
/**
 * Scale Vector
 *
 * Multiply vector by scalar.
 *
 * @param vec - Vector
 * @param scalar - Scaling factor
 * @returns Scaled vector
 */
export declare function scaleVector(vec: number[], scalar: number): number[];
//# sourceMappingURL=vectorField.d.ts.map