import json
import os
import subprocess
import sys
import urllib.error
import urllib.request

REPO = "gaokao-chinese"
OWNER = "52ny"


def get_token():
    env = dict(os.environ)
    env["GCM_INTERACTIVE"] = "never"
    try:
        p = subprocess.run(
            ["git", "credential", "fill"],
            input="protocol=https\nhost=github.com\n\n",
            capture_output=True,
            text=True,
            env=env,
            timeout=20,
        )
    except Exception as e:
        print("CRED_ERROR", type(e).__name__)
        return None
    token = None
    for line in (p.stdout or "").splitlines():
        if line.startswith("password="):
            token = line.split("=", 1)[1].strip()
    return token


def api(method, path, token, body=None):
    url = "https://api.github.com" + path
    data = json.dumps(body).encode("utf-8") if body is not None else None
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("Authorization", "token " + token)
    req.add_header("Accept", "application/vnd.github+json")
    req.add_header("User-Agent", "shiwen-publisher")
    if data:
        req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=25) as r:
            return r.status, json.loads(r.read().decode("utf-8") or "{}")
    except urllib.error.HTTPError as e:
        try:
            detail = json.loads(e.read().decode("utf-8") or "{}")
        except Exception:
            detail = {}
        return e.code, detail
    except Exception as e:
        return 0, {"error": type(e).__name__}


def main():
    token = get_token()
    if not token:
        print("NO_CRED")
        return 2
    print("CRED_OK")

    code, data = api("GET", f"/repos/{OWNER}/{REPO}", token)
    if code == 200:
        print("REPO_EXISTS", data.get("html_url", ""))
    elif code == 404:
        code2, data2 = api(
            "POST",
            "/user/repos",
            token,
            {
                "name": REPO,
                "description": "拾文 · 高三语文真题与知识通关（静态刷题站）",
                "private": False,
                "auto_init": False,
                "has_issues": True,
                "has_projects": False,
                "has_wiki": False,
            },
        )
        if code2 in (200, 201):
            print("REPO_CREATED", data2.get("html_url", ""))
        else:
            print("REPO_CREATE_FAIL", code2, data2.get("message", ""))
            return 3
    else:
        print("REPO_CHECK_FAIL", code, data.get("message", ""))
        return 3

    code, data = api("GET", f"/repos/{OWNER}/{REPO}/pages", token)
    if code == 200:
        print("PAGES_ON", data.get("html_url", ""))
    elif code == 404:
        code2, data2 = api(
            "POST",
            f"/repos/{OWNER}/{REPO}/pages",
            token,
            {"source": {"branch": "main", "path": "/"}},
        )
        if code2 in (200, 201):
            print("PAGES_ENABLED", data2.get("html_url", ""))
        else:
            print("PAGES_ENABLE_FAIL", code2, data2.get("message", ""))
    else:
        print("PAGES_CHECK_FAIL", code, data.get("message", ""))
    return 0


if __name__ == "__main__":
    sys.exit(main())
