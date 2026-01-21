#!/usr/bin/env python3
import argparse
import json
import random
import sys


def parse_lengths(raw):
    if not raw:
        return []
    return [int(val) for val in raw.split(",") if val.strip()]


def parse_set(raw):
    if not raw:
        return set()
    return {val.strip() for val in raw.split(",") if val.strip()}


def resolve_tolerance(raw):
    if raw is None:
        return 0.0
    try:
        return float(raw)
    except ValueError:
        return 0.0


def within_tolerance(value, target, tolerance):
    if tolerance <= 0:
        return value == target
    if tolerance <= 1:
        return abs(value - target) <= target * tolerance
    return abs(value - target) <= tolerance


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dataset", required=True)
    parser.add_argument("--split", default="validation")
    parser.add_argument("--config", default="default")
    parser.add_argument("--revision")
    parser.add_argument("--lengths", default="")
    parser.add_argument("--length-tolerance", default="0")
    parser.add_argument("--max-rows", type=int, default=1)
    parser.add_argument("--seed")
    parser.add_argument("--dataset-filter")
    parser.add_argument("--task-groups")
    parser.add_argument("--task-types")
    parser.add_argument("--fields")
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    try:
        from datasets import load_dataset
    except Exception as exc:
        sys.stderr.write(
            "Missing dependency: install with `python3 -m pip install datasets`\n"
        )
        sys.stderr.write(str(exc) + "\n")
        sys.exit(2)

    targets = parse_lengths(args.lengths)
    tolerance = resolve_tolerance(args.length_tolerance)
    seed = None if args.seed is None else int(args.seed)
    dataset_filter = args.dataset_filter
    task_groups = parse_set(args.task_groups)
    task_types = parse_set(args.task_types)
    fields = parse_set(args.fields)

    buckets = {target: [] for target in targets}
    seen = {target: 0 for target in targets}
    rngs = {target: random.Random(seed + target) for target in targets} if seed is not None else {}

    dataset = load_dataset(
        args.dataset,
        args.config,
        split=args.split,
        streaming=True,
        revision=args.revision,
    )

    def keep_row(row):
        if dataset_filter and row.get("dataset") != dataset_filter:
            return False
        if task_groups and row.get("task_group") not in task_groups:
            return False
        if task_types and row.get("task") not in task_types:
            return False
        return True

    def prune_row(row):
        if not fields:
            return row
        return {key: row.get(key) for key in fields}

    def buckets_full():
        return all(len(rows) >= args.max_rows for rows in buckets.values())

    for row in dataset:
        if not keep_row(row):
            continue
        ctx_len = row.get("context_len")
        if ctx_len is None:
            continue
        for target in targets:
            if within_tolerance(ctx_len, target, tolerance):
                bucket = buckets.get(target)
                if bucket is None:
                    continue
                if seed is None:
                    if len(bucket) < args.max_rows:
                        bucket.append(prune_row(row))
                else:
                    seen[target] += 1
                    if len(bucket) < args.max_rows:
                        bucket.append(prune_row(row))
                    else:
                        idx = rngs[target].randrange(seen[target])
                        if idx < args.max_rows:
                            bucket[idx] = prune_row(row)
        if seed is None and buckets_full():
            break

    output_rows = []
    for rows in buckets.values():
        output_rows.extend(rows)

    payload = {
        "targets": targets,
        "counts": {str(key): len(val) for key, val in buckets.items()},
        "rows": output_rows,
    }
    if seed is not None:
        payload["seed"] = seed

    with open(args.output, "w", encoding="utf8") as handle:
        json.dump(payload, handle, ensure_ascii=True, indent=2)


if __name__ == "__main__":
    main()
