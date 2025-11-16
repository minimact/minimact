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
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error(`Vector dimension mismatch: ${vecA.length} vs ${vecB.length}`);
  }

  if (vecA.length === 0) {
    return 0;
  }

  // Compute dot product
  const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);

  // Compute magnitudes
  const magA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const magB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));

  // Handle zero vectors
  if (magA === 0 || magB === 0) {
    return 0;
  }

  return dotProduct / (magA * magB);
}

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
export function euclideanDistance(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error(`Vector dimension mismatch: ${vecA.length} vs ${vecB.length}`);
  }

  return Math.sqrt(
    vecA.reduce((sum, a, i) => sum + Math.pow(a - vecB[i], 2), 0)
  );
}

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
export function normalizeVector(vec: number[]): number[] {
  const magnitude = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0));

  if (magnitude === 0) {
    return vec; // Cannot normalize zero vector
  }

  return vec.map(v => v / magnitude);
}

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
export function tuneVectorField(
  currentField: number[],
  targetField: number[],
  learningRate: number = 0.1
): number[] {
  if (currentField.length !== targetField.length) {
    throw new Error(`Vector dimension mismatch: ${currentField.length} vs ${targetField.length}`);
  }

  // Gradient descent toward target
  return currentField.map((val, i) =>
    val + learningRate * (targetField[i] - val)
  );
}

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
export function dotProduct(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error(`Vector dimension mismatch: ${vecA.length} vs ${vecB.length}`);
  }

  return vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
}

/**
 * Vector Magnitude
 *
 * Computes the length of a vector.
 *
 * @param vec - Vector
 * @returns Magnitude (length)
 */
export function magnitude(vec: number[]): number {
  return Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0));
}

/**
 * Add Vectors
 *
 * Element-wise vector addition.
 *
 * @param vecA - First vector
 * @param vecB - Second vector
 * @returns Sum vector
 */
export function addVectors(vecA: number[], vecB: number[]): number[] {
  if (vecA.length !== vecB.length) {
    throw new Error(`Vector dimension mismatch: ${vecA.length} vs ${vecB.length}`);
  }

  return vecA.map((a, i) => a + vecB[i]);
}

/**
 * Subtract Vectors
 *
 * Element-wise vector subtraction.
 *
 * @param vecA - First vector
 * @param vecB - Second vector
 * @returns Difference vector
 */
export function subtractVectors(vecA: number[], vecB: number[]): number[] {
  if (vecA.length !== vecB.length) {
    throw new Error(`Vector dimension mismatch: ${vecA.length} vs ${vecB.length}`);
  }

  return vecA.map((a, i) => a - vecB[i]);
}

/**
 * Scale Vector
 *
 * Multiply vector by scalar.
 *
 * @param vec - Vector
 * @param scalar - Scaling factor
 * @returns Scaled vector
 */
export function scaleVector(vec: number[], scalar: number): number[] {
  return vec.map(v => v * scalar);
}
