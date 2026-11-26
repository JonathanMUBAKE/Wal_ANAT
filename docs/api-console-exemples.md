### `GET /api/admin/sessions` — 200

```json
[
  {
    "id": "ses_e597222001c0",
    "user_id": "u_cedric",
    "user_name": "Responsable informatique",
    "email": "responsable.informatique@anat.example",
    "ip": "127.0.0.1",
    "user_agent": "node",
    "created_at": "2026-11-26T13:28:57.526Z",
    "last_seen_at": "2026-11-26T13:28:57.526Z",
    "expires_at": "2026-12-26T13:28:57.526Z",
    "mine": true
  }
]
```

### `GET /api/admin/users` — 200

```json
[
  {
    "id": "u_prisca",
    "name": "Chef d'antenne Sud",
    "email": "chef.d.antenne.sud@anat.example",
    "title": "Chef de l'Antenne Sud",
    "avatar_color": "#B4553A",
    "is_ai": false,
    "ai_role": null,
    "ai_instructions": null,
    "created_at": "2026-11-26T13:28:51.593Z",
    "status": "active",
    "platform_role": null,
    "failed_logins": 0,
    "locked_until": null,
    "last_login_at": null,
    "access_request_note": null,
    "totp_enabled": false,
    "mfa_failures": 0,
    "mfa_locked_until": null,
    "notification_prefs": {},
    "orgs": [
      {
        "org_id": "org_b39c36427aa1",
        "org_name": "ANAT (démonstration)",
        "role": "member"
      }
    ],
    "active_sessions": 0
  },
  {
    "id": "u_joseph",
    "name": "Représentant provincial Nord",
    "email": "representant.provincial.nord@anat.example",
    "title": "Représentant provincial Nord",
    "avatar_color": "#0B8580",
    "is_ai": false,
    "ai_role": null,
    "ai_instructions": null,
    "created_at": "2026-11-26T13:28:51.591Z",
    "status": "active",
    "platform_role": null,
    "failed_logins": 0,
    "locked_until": null,
    "last_login_at": null,
    "access_request_note": null,
    "totp_enabled": false,
    "mfa_failures": 0,
    "mfa_locked_until": null,
    "notification_prefs": {},
    "orgs": [
      {
        "org_id": "org_b39c36427aa1",
        "org_name": "ANAT (démonstration)",
        "role": "member"
      }
    ],
    "active_sessions": 0
  },
  "… et 15 autres"
]
```

### `GET /api/admin/audit` — 200

```json
{
  "entries": [
    {
      "id": "sev_c26953fcb242",
      "source": "security",
      "created_at": "2026-11-26T13:28:57.528Z",
      "kind": "login.success",
      "label": "Connexion réussie",
      "category": "Sécurité",
      "severity": "normale",
      "actor_id": "u_cedric",
      "actor_name": "Responsable informatique",
      "target_id": null,
      "object_id": null,
      "summary": "connexion de démonstration",
      "org_id": null,
      "org_name": null,
      "ip": "127.0.0.1"
    },
    {
      "id": "act_4edfc84a0780",
      "source": "activity",
      "created_at": "2026-11-26T13:28:52.115Z",
      "kind": "attribution.approved",
      "label": "Fiche d'attribution approuvée",
      "category": "Organisation",
      "severity": "importante",
      "actor_id": "u_alice",
      "actor_name": "Directrice générale",
      "target_id": null,
      "object_id": "sht_b81ec33d29f9",
      "summary": "",
      "org_id": "org_b39c36427aa1",
      "org_name": "ANAT (démonstration)",
      "ip": null
    },
    "… et 287 autres"
  ],
  "categories": [
    "Partenariats",
    "Décisions",
    "… et 13 autres"
  ],
  "truncated": false
}
```

### `GET /api/admin/events` — 200

```json
[
  {
    "id": "sev_c26953fcb242",
    "kind": "login.success",
    "ip": "127.0.0.1",
    "data": {
      "demo": true
    },
    "created_at": "2026-11-26T13:28:57.528Z",
    "user_name": "Responsable informatique",
    "actor_name": null
  }
]
```

### `GET /api/admin/health` — 200

```json
{
  "generated_at": "2026-11-26T13:28:57.583Z",
  "version": "",
  "accounts": {
    "total": 17,
    "active": 17,
    "invited": 0,
    "suspended": 0,
    "pending": 0,
    "without_mfa_admins": 2,
    "never_logged": 16
  },
  "sessions": {
    "active": 1,
    "users": 1
  },
  "mail": {
    "configured": false,
    "sent_7d": 0,
    "failed_7d": 0
  },
  "storage": {
    "files": 2,
    "bytes": 658
  },
  "volumes": {
    "organizations": 1,
    "units": 12,
    "projects": 6,
    "tasks": 57,
    "tasks_late": 5,
    "meetings": 16,
    "decisions": 11,
    "mail": 8,
    "mail_late": 0,
    "partners": 6,
    "agents": 17
  },
  "security": {
    "failed_logins_24h": 0,
    "locked_24h": 0
  },
  "alerts": [
    {
      "level": "warning",
      "text": "2 compte(s) à droits élevés sans double authentification."
    },
    {
      "level": "warning",
      "text": "Aucune messagerie configurée : les notifications ne partent pas par courriel."
    }
  ]
}
```

### `GET /api/admin/roles-matrix` — 200

```json
{
  "groups": [
    {
      "group": "Projets",
      "items": [
        "{…}",
        "{…}",
        "… et 5 autres"
      ]
    },
    {
      "group": "Tâches",
      "items": [
        "{…}",
        "{…}",
        "… et 5 autres"
      ]
    },
    "… et 11 autres"
  ],
  "profiles": [
    {
      "id": "prf_owner_org_b39c36427aa1",
      "org_name": "ANAT (démonstration)",
      "name": "Propriétaire",
      "description": "Tous les droits. Ce profil ne peut pas être modifié.",
      "base_role": "owner",
      "permissions": [
        "projects.create",
        "projects.import",
        "… et 56 autres"
      ],
      "is_system": true,
      "members": 0
    },
    {
      "id": "prf_admin_org_b39c36427aa1",
      "org_name": "ANAT (démonstration)",
      "name": "Administrateur",
      "description": "Administre l'organisation, ses personnes et ses projets.",
      "base_role": "admin",
      "permissions": [
        "projects.create",
        "projects.import",
        "… et 56 autres"
      ],
      "is_system": true,
      "members": 0
    },
    "… et 11 autres"
  ]
}
```

### `GET /api/admin/settings` — 200

```json
{
  "registration": "invite"
}
```

### `GET /api/auth/sessions` — 200

```json
[
  {
    "ip": "127.0.0.1",
    "user_agent": "node",
    "created_at": "2026-11-26T13:28:57.526Z",
    "last_seen_at": "2026-11-26T13:28:57.526Z",
    "id": "ses_e597222001c0",
    "current": true
  }
]
```

### `GET /api/ai/approvals` — 200

```json
[]
```
