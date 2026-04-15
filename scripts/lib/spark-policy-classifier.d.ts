export type SparkPolicyVerdict = 'allowed' | 'forbidden' | 'neutral';

export interface SparkPolicyEvaluation {
  line: number;
  marker: string;
  markerIndex: number;
  verdict: SparkPolicyVerdict;
  reason: string;
  context: string;
  relevantText: string;
}

export declare function getSparkPolicyViolations(content: string): SparkPolicyEvaluation[];
export declare function evaluateSparkPolicyContent(content: string): SparkPolicyEvaluation[];
export declare function classifySparkPolicyLineContext(
  text: string,
  markerIndex: number
): Omit<SparkPolicyEvaluation, 'line'>;
