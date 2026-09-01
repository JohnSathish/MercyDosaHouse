#!/usr/bin/env python3
"""Rebuild nep-erp nginx.conf from a corrupted backup (e.g. bak9).
Extracts all complete upstream/server blocks, keeps ERP/college blocks,
drops MDH duplicates, appends one clean MDH section inside http {}.
Usage on VPS:
  python3 rebuild-nep-nginx.py /opt/nep-erp/nginx/nginx.conf.bak9 /opt/nep-erp/nginx/nginx.conf
"""
from __future__ import annotations

import sys
from pathlib import Path


MDH = """
  # ── Mercy Dosa House ───
  upstream mdh_api    { server 172.17.0.1:13001; }
  upstream mdh_web    { server 172.17.0.1:13000; }
  upstream mdh_admin  { server 172.17.0.1:13002; }

  server {
    listen 80;
    server_name mercydosahouse.com www.mercydosahouse.com;
    location /.well-known/acme-challenge/ { root /var/www/certbot; }
    location / { return 301 https://$host$request_uri; }
  }

  server {
    listen 80;
    server_name admin.mercydosahouse.com;
    location /.well-known/acme-challenge/ { root /var/www/certbot; }
    location / { return 301 https://$host$request_uri; }
  }

  server {
    listen 443 ssl;
    server_name mercydosahouse.com www.mercydosahouse.com;
    ssl_certificate     /etc/letsencrypt/live/mercydosahouse.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/mercydosahouse.com/privkey.pem;
    client_max_body_size 10M;
    location ^~ /api/ {
      proxy_pass http://172.17.0.1:13001;
      proxy_http_version 1.1;
      proxy_set_header Host $host;
      proxy_set_header X-Real-IP $remote_addr;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
      proxy_set_header X-Forwarded-Proto https;
    }
    location ^~ /socket.io {
      proxy_pass http://172.17.0.1:13001;
      proxy_http_version 1.1;
      proxy_set_header Upgrade $http_upgrade;
      proxy_set_header Connection "upgrade";
      proxy_set_header Host $host;
      proxy_set_header X-Forwarded-Proto https;
      proxy_read_timeout 86400;
      proxy_send_timeout 86400;
    }
    location ^~ /uploads/ {
      proxy_pass http://172.17.0.1:13001/uploads/;
      proxy_set_header Host $host;
      proxy_set_header X-Forwarded-Proto https;
    }
    location / {
      proxy_pass http://172.17.0.1:13000;
      proxy_http_version 1.1;
      proxy_set_header Host $host;
      proxy_set_header X-Real-IP $remote_addr;
      proxy_set_header X-Forwarded-Proto https;
    }
  }

  server {
    listen 443 ssl;
    server_name admin.mercydosahouse.com;
    ssl_certificate     /etc/letsencrypt/live/mercydosahouse.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/mercydosahouse.com/privkey.pem;
    client_max_body_size 10M;
    location ^~ /uploads/ {
      proxy_pass http://172.17.0.1:13001/uploads/;
      proxy_set_header Host $host;
      proxy_set_header X-Forwarded-Proto https;
    }
    location / {
      proxy_pass http://172.17.0.1:13002;
      proxy_http_version 1.1;
      proxy_set_header Host $host;
      proxy_set_header X-Real-IP $remote_addr;
      proxy_set_header X-Forwarded-Proto https;
    }
  }
"""


def extract_blocks(text: str) -> list[str]:
    blocks: list[str] = []
    keywords = ("upstream ", "server ", "map ", "limit_req_zone ")
    pos = 0
    while pos < len(text):
        found_at = -1
        found_kw = ""
        for kw in keywords:
            idx = text.find(kw, pos)
            if idx != -1 and (found_at == -1 or idx < found_at):
                found_at = idx
                found_kw = kw
        if found_at == -1:
            break
        brace = text.find("{", found_at)
        if brace == -1:
            pos = found_at + len(found_kw)
            continue
        depth = 0
        end = None
        for j in range(brace, len(text)):
            if text[j] == "{":
                depth += 1
            elif text[j] == "}":
                depth -= 1
                if depth == 0:
                    end = j + 1
                    break
        if end is None:
            break
        block = text[found_at:end].strip()
        if block not in blocks:
            blocks.append(block)
        pos = end
    return blocks


def block_key(block: str) -> str:
    for line in block.splitlines():
        line = line.strip()
        if line.startswith("server_name"):
            return line
        if line.startswith("upstream "):
            name = line.split()[1]
            return f"upstream {name}"
    return block[:80]


def main() -> None:
    src_path = Path(sys.argv[1] if len(sys.argv) > 1 else "/opt/nep-erp/nginx/nginx.conf.bak9")
    dst_path = Path(sys.argv[2] if len(sys.argv) > 2 else "/opt/nep-erp/nginx/nginx.conf")

    src = src_path.read_text()
    http_pos = src.find("http {")
    preamble = src[:http_pos] if http_pos >= 0 else ""
    body = src[http_pos + len("http {") :] if http_pos >= 0 else src

    blocks = extract_blocks(body)
    kept: dict[str, str] = {}
    for block in blocks:
        if "mercydosahouse" in block:
            continue
        key = block_key(block)
        kept[key] = block

    erp_blocks = list(kept.values())
    fixed = preamble + "http {\n  " + "\n\n  ".join(erp_blocks) + "\n" + MDH + "\n}\n"
    dst_path.write_text(fixed)

    lines = fixed.count("\n") + 1
    print(f"Wrote {dst_path}")
    print(f"  lines={lines}  listen443={fixed.count('listen 443')}  erp_blocks={len(erp_blocks)}")


if __name__ == "__main__":
    main()
