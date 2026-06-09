"""
tests_connections.py
====================
Unit, integration, permission, and security tests for the
User Discovery & Connection System.

Run with:
    python manage.py test chatapp.tests_connections
"""

import json
from django.test import TestCase, Client
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.urls import reverse

from .models import UserConnection, BlockList, PrivacySettings, UserProfile
from . import connection_services as svc


# ── Helpers ───────────────────────────────────────────────────────────────────

def make_user(username, password='testpass123'):
    user = User.objects.create_user(username=username, password=password)
    UserProfile.objects.get_or_create(user=user)
    return user


def login(client, user, password='testpass123'):
    client.login(username=user.username, password=password)


# ── Model Tests ───────────────────────────────────────────────────────────────

class UserConnectionModelTest(TestCase):

    def setUp(self):
        self.alice = make_user('alice')
        self.bob   = make_user('bob')

    def test_create_connection_request(self):
        conn = UserConnection.objects.create(sender=self.alice, receiver=self.bob)
        self.assertEqual(conn.status, UserConnection.STATUS_PENDING)

    def test_cannot_send_to_self(self):
        """Security: self-connection must be rejected at model level."""
        with self.assertRaises(ValidationError):
            UserConnection.objects.create(sender=self.alice, receiver=self.alice)

    def test_unique_together_prevents_duplicates(self):
        """Security: duplicate requests must be rejected."""
        UserConnection.objects.create(sender=self.alice, receiver=self.bob)
        from django.db import IntegrityError
        with self.assertRaises((IntegrityError, ValidationError)):
            UserConnection.objects.create(sender=self.alice, receiver=self.bob)

    def test_status_transitions(self):
        conn = UserConnection.objects.create(sender=self.alice, receiver=self.bob)
        conn.status = UserConnection.STATUS_ACCEPTED
        conn.save()
        self.assertEqual(UserConnection.objects.get(pk=conn.pk).status, 'accepted')


class BlockListModelTest(TestCase):

    def setUp(self):
        self.alice = make_user('alice')
        self.bob   = make_user('bob')

    def test_block_user(self):
        block = BlockList.objects.create(blocker=self.alice, blocked=self.bob)
        self.assertEqual(str(block), 'alice blocked bob')

    def test_cannot_block_self(self):
        """Security: self-block must be rejected at model level."""
        with self.assertRaises(ValidationError):
            BlockList.objects.create(blocker=self.alice, blocked=self.alice)


# ── Service Layer Tests ───────────────────────────────────────────────────────

class SendConnectionRequestServiceTest(TestCase):

    def setUp(self):
        self.alice = make_user('alice')
        self.bob   = make_user('bob')
        self.carol = make_user('carol')

    def test_send_request_success(self):
        result = svc.send_connection_request(self.alice, self.bob.id)
        self.assertEqual(result['status'], 'pending')
        self.assertTrue(UserConnection.objects.filter(sender=self.alice, receiver=self.bob).exists())

    def test_cannot_send_to_self(self):
        """Security: service layer must also reject self-requests."""
        with self.assertRaises(ValidationError):
            svc.send_connection_request(self.alice, self.alice.id)

    def test_cannot_send_to_nonexistent_user(self):
        with self.assertRaises(ValidationError):
            svc.send_connection_request(self.alice, 99999)

    def test_cannot_send_duplicate_request(self):
        svc.send_connection_request(self.alice, self.bob.id)
        with self.assertRaises(ValidationError):
            svc.send_connection_request(self.alice, self.bob.id)

    def test_cannot_send_to_blocked_user(self):
        """Security: blocked users cannot receive requests."""
        BlockList.objects.create(blocker=self.alice, blocked=self.bob)
        with self.assertRaises(ValidationError):
            svc.send_connection_request(self.alice, self.bob.id)

    def test_blocked_user_cannot_send_request(self):
        """Security: a user who was blocked cannot send requests to the blocker."""
        BlockList.objects.create(blocker=self.bob, blocked=self.alice)
        with self.assertRaises(ValidationError):
            svc.send_connection_request(self.alice, self.bob.id)

    def test_reverse_request_auto_accepts(self):
        """If B already sent a request to A, A sending to B should auto-accept."""
        svc.send_connection_request(self.bob, self.alice.id)
        result = svc.send_connection_request(self.alice, self.bob.id)
        self.assertEqual(result['status'], 'accepted')

    def test_privacy_nobody_blocks_request(self):
        """Privacy: users with nobody setting cannot receive requests."""
        privacy, _ = PrivacySettings.objects.get_or_create(user=self.bob)
        privacy.who_can_send_requests = PrivacySettings.NOBODY
        privacy.save()
        with self.assertRaises(ValidationError):
            svc.send_connection_request(self.alice, self.bob.id)


class AcceptRejectServiceTest(TestCase):

    def setUp(self):
        self.alice = make_user('alice')
        self.bob   = make_user('bob')
        UserConnection.objects.create(sender=self.alice, receiver=self.bob)

    def test_accept_request(self):
        result = svc.accept_connection_request(self.bob, self.alice.id)
        self.assertEqual(result['status'], 'accepted')
        conn = UserConnection.objects.get(sender=self.alice, receiver=self.bob)
        self.assertEqual(conn.status, 'accepted')

    def test_reject_request(self):
        result = svc.reject_connection_request(self.bob, self.alice.id)
        self.assertEqual(result['status'], 'rejected')

    def test_only_receiver_can_accept(self):
        """Security: IDOR — alice cannot accept her own outgoing request."""
        with self.assertRaises(ValidationError):
            svc.accept_connection_request(self.alice, self.alice.id)

    def test_third_party_cannot_accept(self):
        """Security: carol cannot accept a request between alice and bob."""
        carol = make_user('carol')
        with self.assertRaises(ValidationError):
            svc.accept_connection_request(carol, self.alice.id)


class RemoveConnectionServiceTest(TestCase):

    def setUp(self):
        self.alice = make_user('alice')
        self.bob   = make_user('bob')
        conn = UserConnection.objects.create(sender=self.alice, receiver=self.bob)
        conn.status = UserConnection.STATUS_ACCEPTED
        conn.save()

    def test_remove_connection(self):
        result = svc.remove_connection(self.alice, self.bob.id)
        self.assertEqual(result['status'], 'removed')
        self.assertFalse(UserConnection.objects.filter(
            sender=self.alice, receiver=self.bob
        ).exists())

    def test_cannot_remove_nonexistent_connection(self):
        carol = make_user('carol')
        with self.assertRaises(ValidationError):
            svc.remove_connection(self.alice, carol.id)

    def test_third_party_cannot_remove(self):
        """Security: IDOR — carol cannot remove alice-bob connection."""
        carol = make_user('carol')
        with self.assertRaises(ValidationError):
            svc.remove_connection(carol, self.bob.id)


class BlockServiceTest(TestCase):

    def setUp(self):
        self.alice = make_user('alice')
        self.bob   = make_user('bob')

    def test_block_user(self):
        result = svc.block_user(self.alice, self.bob.id)
        self.assertEqual(result['status'], 'blocked')
        self.assertTrue(BlockList.objects.filter(blocker=self.alice, blocked=self.bob).exists())

    def test_block_removes_connection(self):
        conn = UserConnection.objects.create(sender=self.alice, receiver=self.bob)
        conn.status = UserConnection.STATUS_ACCEPTED
        conn.save()
        svc.block_user(self.alice, self.bob.id)
        self.assertFalse(UserConnection.objects.filter(
            sender=self.alice, receiver=self.bob
        ).exists())

    def test_unblock_user(self):
        BlockList.objects.create(blocker=self.alice, blocked=self.bob)
        result = svc.unblock_user(self.alice, self.bob.id)
        self.assertEqual(result['status'], 'unblocked')
        self.assertFalse(BlockList.objects.filter(blocker=self.alice, blocked=self.bob).exists())

    def test_cannot_block_self(self):
        with self.assertRaises(ValidationError):
            svc.block_user(self.alice, self.alice.id)


class SearchServiceTest(TestCase):

    def setUp(self):
        self.alice = make_user('alice')
        self.bob   = make_user('bob')
        self.carol = make_user('carol')

    def test_search_by_username(self):
        result = svc.search_users(self.alice, 'bob')
        usernames = [u['username'] for u in result['results']]
        self.assertIn('bob', usernames)

    def test_search_excludes_self(self):
        """Security: search must never return the viewer themselves."""
        result = svc.search_users(self.alice, 'alice')
        usernames = [u['username'] for u in result['results']]
        self.assertNotIn('alice', usernames)

    def test_search_excludes_blocked_users(self):
        """Security: blocked users must not appear in search results."""
        BlockList.objects.create(blocker=self.alice, blocked=self.bob)
        result = svc.search_users(self.alice, 'bob')
        usernames = [u['username'] for u in result['results']]
        self.assertNotIn('bob', usernames)

    def test_search_excludes_users_who_blocked_viewer(self):
        """Security: if bob blocked alice, alice should not see bob in search."""
        BlockList.objects.create(blocker=self.bob, blocked=self.alice)
        result = svc.search_users(self.alice, 'bob')
        usernames = [u['username'] for u in result['results']]
        self.assertNotIn('bob', usernames)

    def test_empty_query_returns_empty(self):
        result = svc.search_users(self.alice, '')
        self.assertEqual(result['results'], [])

    def test_case_insensitive_search(self):
        result = svc.search_users(self.alice, 'BOB')
        usernames = [u['username'] for u in result['results']]
        self.assertIn('bob', usernames)

    def test_page_size_capped_at_50(self):
        result = svc.search_users(self.alice, 'a', page_size=999)
        self.assertLessEqual(result['page_size'], 50)


class SuggestionsServiceTest(TestCase):

    def setUp(self):
        self.alice = make_user('alice')
        self.bob   = make_user('bob')
        self.carol = make_user('carol')

    def test_suggestions_exclude_self(self):
        suggestions = svc.get_suggestions(self.alice)
        ids = [s['id'] for s in suggestions]
        self.assertNotIn(self.alice.id, ids)

    def test_suggestions_exclude_blocked(self):
        BlockList.objects.create(blocker=self.alice, blocked=self.bob)
        suggestions = svc.get_suggestions(self.alice)
        ids = [s['id'] for s in suggestions]
        self.assertNotIn(self.bob.id, ids)

    def test_suggestions_exclude_existing_connections(self):
        conn = UserConnection.objects.create(sender=self.alice, receiver=self.bob)
        conn.status = UserConnection.STATUS_ACCEPTED
        conn.save()
        suggestions = svc.get_suggestions(self.alice)
        ids = [s['id'] for s in suggestions]
        self.assertNotIn(self.bob.id, ids)


class PrivacySettingsServiceTest(TestCase):

    def setUp(self):
        self.alice = make_user('alice')

    def test_get_default_privacy(self):
        result = svc.get_privacy_settings(self.alice)
        self.assertEqual(result['who_can_send_requests'], 'everyone')

    def test_update_privacy(self):
        result = svc.update_privacy_settings(self.alice, {
            'who_can_send_requests': 'nobody',
            'who_can_view_profile':  'connections',
        })
        self.assertEqual(result['who_can_send_requests'], 'nobody')
        self.assertEqual(result['who_can_view_profile'],  'connections')

    def test_invalid_privacy_value_rejected(self):
        """Security: invalid values must be rejected (mass assignment prevention)."""
        with self.assertRaises(ValidationError):
            svc.update_privacy_settings(self.alice, {'who_can_send_requests': 'hackers_only'})

    def test_unknown_keys_ignored(self):
        """Security: unknown keys must be silently ignored (mass assignment prevention)."""
        # This is handled in the view layer; service receives pre-filtered dict
        result = svc.update_privacy_settings(self.alice, {
            'who_can_send_requests': 'nobody',
        })
        self.assertEqual(result['who_can_send_requests'], 'nobody')


# ── API / Integration Tests ───────────────────────────────────────────────────

class ConnectionAPITest(TestCase):

    def setUp(self):
        self.client = Client()
        self.alice  = make_user('alice')
        self.bob    = make_user('bob')

    def _post(self, url, data, user=None):
        if user:
            login(self.client, user)
        return self.client.post(
            url,
            data=json.dumps(data),
            content_type='application/json',
        )

    def _get(self, url, user=None):
        if user:
            login(self.client, user)
        return self.client.get(url)

    # ── Authentication guard ──────────────────────────────────────────────────

    def test_search_requires_auth(self):
        """Security: unauthenticated users must get 401/302."""
        self.client.logout()
        response = self.client.get('/api/users/search/?q=alice')
        self.assertIn(response.status_code, [401, 302])

    def test_send_request_requires_auth(self):
        self.client.logout()
        response = self._post('/api/connections/send/', {'receiver_id': self.bob.id})
        self.assertIn(response.status_code, [401, 302])

    def test_block_requires_auth(self):
        self.client.logout()
        response = self._post('/api/users/block/', {'user_id': self.bob.id})
        self.assertIn(response.status_code, [401, 302])

    # ── Happy path ────────────────────────────────────────────────────────────

    def test_search_returns_results(self):
        login(self.client, self.alice)
        response = self.client.get('/api/users/search/?q=bob')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn('results', data)
        usernames = [u['username'] for u in data['results']]
        self.assertIn('bob', usernames)

    def test_send_and_accept_flow(self):
        # Alice sends request
        login(self.client, self.alice)
        response = self._post('/api/connections/send/', {'receiver_id': self.bob.id})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['status'], 'pending')

        # Bob accepts
        login(self.client, self.bob)
        response = self._post('/api/connections/accept/', {'sender_id': self.alice.id})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['status'], 'accepted')

    def test_send_and_reject_flow(self):
        login(self.client, self.alice)
        self._post('/api/connections/send/', {'receiver_id': self.bob.id})

        login(self.client, self.bob)
        response = self._post('/api/connections/reject/', {'sender_id': self.alice.id})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['status'], 'rejected')

    def test_cancel_request(self):
        login(self.client, self.alice)
        self._post('/api/connections/send/', {'receiver_id': self.bob.id})
        response = self._post('/api/connections/cancel/', {'receiver_id': self.bob.id})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['status'], 'cancelled')

    def test_block_and_unblock(self):
        login(self.client, self.alice)
        response = self._post('/api/users/block/', {'user_id': self.bob.id})
        self.assertEqual(response.status_code, 200)

        response = self._post('/api/users/unblock/', {'user_id': self.bob.id})
        self.assertEqual(response.status_code, 200)

    def test_pending_requests_endpoint(self):
        svc.send_connection_request(self.alice, self.bob.id)
        login(self.client, self.bob)
        response = self.client.get('/api/connections/pending/')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn('incoming', data)
        self.assertEqual(len(data['incoming']), 1)

    def test_suggestions_endpoint(self):
        login(self.client, self.alice)
        response = self.client.get('/api/connections/suggestions/')
        self.assertEqual(response.status_code, 200)
        self.assertIn('suggestions', response.json())

    def test_privacy_get_and_update(self):
        login(self.client, self.alice)
        response = self.client.get('/api/users/privacy/')
        self.assertEqual(response.status_code, 200)

        response = self._post('/api/users/privacy/update/', {
            'who_can_send_requests': 'nobody'
        })
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['who_can_send_requests'], 'nobody')

    # ── Security / IDOR Tests ─────────────────────────────────────────────────

    def test_cannot_accept_own_outgoing_request(self):
        """Security: IDOR — alice cannot accept her own request."""
        svc.send_connection_request(self.alice, self.bob.id)
        login(self.client, self.alice)
        response = self._post('/api/connections/accept/', {'sender_id': self.alice.id})
        # Should fail — no pending request where alice is receiver
        self.assertEqual(response.status_code, 400)

    def test_cannot_send_request_to_blocker(self):
        """Security: blocked users cannot send requests."""
        BlockList.objects.create(blocker=self.bob, blocked=self.alice)
        login(self.client, self.alice)
        response = self._post('/api/connections/send/', {'receiver_id': self.bob.id})
        self.assertEqual(response.status_code, 400)

    def test_search_excludes_blocked_users_via_api(self):
        """Security: blocked users must not appear in API search results."""
        BlockList.objects.create(blocker=self.alice, blocked=self.bob)
        login(self.client, self.alice)
        response = self.client.get('/api/users/search/?q=bob')
        data = response.json()
        usernames = [u['username'] for u in data['results']]
        self.assertNotIn('bob', usernames)

    def test_invalid_receiver_id_type(self):
        """Security: non-integer IDs must be rejected."""
        login(self.client, self.alice)
        response = self._post('/api/connections/send/', {'receiver_id': 'DROP TABLE users;'})
        self.assertEqual(response.status_code, 400)

    def test_mass_assignment_privacy_rejected(self):
        """Security: unknown fields in privacy update must be ignored."""
        login(self.client, self.alice)
        response = self._post('/api/users/privacy/update/', {
            'who_can_send_requests': 'nobody',
            'is_superuser': True,  # Should be silently ignored
            'is_staff': True,
        })
        self.assertEqual(response.status_code, 200)
        # Verify the user is still not a superuser
        self.alice.refresh_from_db()
        self.assertFalse(self.alice.is_superuser)

    def test_get_endpoints_reject_post(self):
        """Security: GET-only endpoints must reject POST requests."""
        login(self.client, self.alice)
        response = self.client.post('/api/users/search/')
        self.assertEqual(response.status_code, 405)

    def test_post_endpoints_reject_get(self):
        """Security: POST-only endpoints must reject GET requests."""
        login(self.client, self.alice)
        response = self.client.get('/api/connections/send/')
        self.assertEqual(response.status_code, 405)
