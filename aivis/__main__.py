"""Command line: python -m aivis {serve,run,demo,providers}"""
import argparse
import logging

from . import config


def main():
    ap = argparse.ArgumentParser(prog="aivis", description="Self-hosted AI search visibility tracker")
    sub = ap.add_subparsers(dest="cmd", required=True)
    s = sub.add_parser("serve", help="start the web dashboard")
    s.add_argument("--host", default="127.0.0.1")
    s.add_argument("--port", type=int, default=8000)
    r = sub.add_parser("run", help="run all prompts now (for cron)")
    r.add_argument("project", type=int, nargs="?", help="project id (default: all)")
    d = sub.add_parser("demo", help="create a demo project with 30 days of synthetic data")
    d.add_argument("--days", type=int, default=30)
    sub.add_parser("providers", help="show which AI providers are configured")
    args = ap.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")

    if args.cmd == "serve":
        import uvicorn
        from .app import create_app
        uvicorn.run(create_app(), host=args.host, port=args.port)
    elif args.cmd == "run":
        from . import runner
        from .db import Database
        db = Database()
        ids = [args.project] if args.project else [p["id"] for p in db.projects()]
        for pid in ids:
            rid = runner.execute_run(db, pid, "cli")
            run = db.one("SELECT * FROM runs WHERE id = ?", (rid,))
            print(f"project {pid}: run {rid} {run['status']} ({run['done']} answers, {run['errors']} errors)")
    elif args.cmd == "demo":
        from . import demo
        from .db import Database
        pid = demo.seed(Database(), args.days)
        print(f"Demo project {pid} created in {config.DATABASE_PATH}. Start with: python -m aivis serve")
    elif args.cmd == "providers":
        from . import providers
        for p in providers.available():
            state = "configured" if p["configured"] else f"missing {p['env']}"
            print(f"{p['label']:<12} {p['model']:<24} {state}")


if __name__ == "__main__":
    main()
