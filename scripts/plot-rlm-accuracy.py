#!/usr/bin/env python3
import argparse
import json
import math
from pathlib import Path


def resolve_metrics(results):
    sample = results[0] if results else {}
    if "baseline_correct_pct" in sample:
        return ("baseline_correct_pct", "rlm_correct_pct", False)
    if "baseline_perfect_pct" in sample:
        return ("baseline_perfect_pct", "rlm_perfect_pct", False)
    if "baseline_f1_avg" in sample:
        return ("baseline_f1_avg", "rlm_f1_avg", True)
    raise ValueError("Unsupported results schema")


def load_results(path):
    payload = json.loads(Path(path).read_text())
    results = payload.get("results", [])
    if not results:
        raise SystemExit(f"No results found in input JSON: {path}")
    return results


def normalize_results(results, base_key, rlm_key, scale_f1):
    x_vals = [row["context_length"] for row in results]
    base_vals = [row[base_key] for row in results]
    rlm_vals = [row[rlm_key] for row in results]
    denom_counts = [row.get("task_count", row.get("sample_count")) for row in results]
    if scale_f1:
        base_vals = [val * 100 for val in base_vals]
        rlm_vals = [val * 100 for val in rlm_vals]
    return x_vals, base_vals, rlm_vals, denom_counts


def mean_std(values):
    count = len(values)
    if count == 0:
        return 0.0, 0.0
    mean = sum(values) / count
    if count == 1:
        return mean, 0.0
    variance = sum((val - mean) ** 2 for val in values) / count
    return mean, math.sqrt(variance)


def wilson_interval(successes, total, z=1.96):
    if total <= 0:
        return 0.0, 0.0, 0.0
    p_hat = successes / total
    z_sq = z ** 2
    denom = 1 + z_sq / total
    center = (p_hat + z_sq / (2 * total)) / denom
    margin = (z * math.sqrt((p_hat * (1 - p_hat) + z_sq / (4 * total)) / total)) / denom
    lower = max(0.0, center - margin)
    upper = min(1.0, center + margin)
    return center, lower, upper


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", action="append", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--title", default="RLM vs Baseline Accuracy")
    parser.add_argument(
        "--mode",
        choices=["both", "baseline", "rlm"],
        default="both",
        help="Which series to plot (default: both)."
    )
    parser.add_argument("--ymin", type=float, default=None)
    parser.add_argument("--ymax", type=float, default=None)
    parser.add_argument(
        "--interval",
        choices=["none", "std", "wilson95"],
        default="std",
        help="Error band style for multiple runs (default: std).",
    )
    args = parser.parse_args()

    runs = [load_results(path) for path in args.input]
    base_key, rlm_key, scale_f1 = resolve_metrics(runs[0])
    normalized = []
    for results in runs:
        base_key_check, rlm_key_check, scale_f1_check = resolve_metrics(results)
        if (base_key_check, rlm_key_check, scale_f1_check) != (base_key, rlm_key, scale_f1):
            raise SystemExit("Mismatched results schema across inputs")
        x_vals, base_vals, rlm_vals, denom_counts = normalize_results(results, base_key, rlm_key, scale_f1)
        normalized.append((x_vals, base_vals, rlm_vals, denom_counts))

    x_vals = normalized[0][0]
    for idx, (x_check, _, _, _) in enumerate(normalized[1:], start=2):
        if x_check != x_vals:
            raise SystemExit(f"Mismatched context lengths in input #{idx}")

    import matplotlib.pyplot as plt

    plt.figure(figsize=(8, 4.8))
    if len(normalized) == 1 and args.interval == "std":
        _, base_vals, rlm_vals, _ = normalized[0]
        if args.mode in ("both", "baseline"):
            plt.plot(x_vals, base_vals, marker="o", label="Baseline")
        if args.mode in ("both", "rlm"):
            plt.plot(x_vals, rlm_vals, marker="o", label="RLM")
    else:
        base_runs = [vals[1] for vals in normalized]
        rlm_runs = [vals[2] for vals in normalized]
        base_means = []
        base_lows = []
        base_highs = []
        rlm_means = []
        rlm_lows = []
        rlm_highs = []

        if args.interval == "wilson95":
            if scale_f1:
                raise SystemExit("Wilson intervals require accuracy-style metrics with sample_count")
            for idx in range(len(x_vals)):
                base_success = 0.0
                base_total = 0
                rlm_success = 0.0
                rlm_total = 0
                for _, base_vals, rlm_vals, denom_counts in normalized:
                    denom_count = denom_counts[idx]
                    if denom_count is None:
                        raise SystemExit("Missing sample_count/task_count for Wilson intervals")
                    base_total += denom_count
                    rlm_total += denom_count
                    base_success += (base_vals[idx] / 100.0) * denom_count
                    rlm_success += (rlm_vals[idx] / 100.0) * denom_count

                base_mean, base_low, base_high = wilson_interval(base_success, base_total)
                rlm_mean, rlm_low, rlm_high = wilson_interval(rlm_success, rlm_total)
                base_means.append(base_mean * 100)
                base_lows.append(base_low * 100)
                base_highs.append(base_high * 100)
                rlm_means.append(rlm_mean * 100)
                rlm_lows.append(rlm_low * 100)
                rlm_highs.append(rlm_high * 100)
        else:
            for idx in range(len(x_vals)):
                base_samples = [run[idx] for run in base_runs]
                rlm_samples = [run[idx] for run in rlm_runs]
                base_mean, base_std = mean_std(base_samples)
                rlm_mean, rlm_std = mean_std(rlm_samples)
                base_means.append(base_mean)
                base_lows.append(base_mean - base_std)
                base_highs.append(base_mean + base_std)
                rlm_means.append(rlm_mean)
                rlm_lows.append(rlm_mean - rlm_std)
                rlm_highs.append(rlm_mean + rlm_std)

        if args.mode in ("both", "baseline"):
            label = "Baseline mean" if len(normalized) > 1 or args.interval != "none" else "Baseline"
            plt.plot(x_vals, base_means, marker="o", label=label)
            if args.interval != "none":
                band_label = "Baseline 95% CI" if args.interval == "wilson95" else "Baseline +/- std"
                plt.fill_between(x_vals, base_lows, base_highs, alpha=0.2, label=band_label)
        if args.mode in ("both", "rlm"):
            label = "RLM mean" if len(normalized) > 1 or args.interval != "none" else "RLM"
            plt.plot(x_vals, rlm_means, marker="o", label=label)
            if args.interval != "none":
                band_label = "RLM 95% CI" if args.interval == "wilson95" else "RLM +/- std"
                plt.fill_between(x_vals, rlm_lows, rlm_highs, alpha=0.2, label=band_label)

    plt.xscale("log", base=2)
    plt.xticks(x_vals, [f"{int(v/1000)}k" if v < 1_000_000 else "1M" for v in x_vals])
    plt.xlabel("Context length (tokens)")
    plt.ylabel("Accuracy (%)")
    plt.title(args.title)
    plt.grid(True, which="both", linestyle="--", alpha=0.4)
    plt.legend()
    if args.ymin is not None or args.ymax is not None:
        plt.ylim(bottom=args.ymin, top=args.ymax)
    Path(args.output).parent.mkdir(parents=True, exist_ok=True)
    plt.tight_layout()
    plt.savefig(args.output, dpi=200)


if __name__ == "__main__":
    main()
