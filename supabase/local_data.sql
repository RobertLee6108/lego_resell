SET session_replication_role = replica;

--
-- PostgreSQL database dump
--

-- \restrict mPOuZLBH8iEU4QAbRU4XX54atZw6azKsuLssc2nHNba48fitGqs58FhkGKzd5xd

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: audit_log_entries; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: custom_oauth_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: flow_state; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: users; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: identities; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: instances; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: oauth_clients; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: sessions; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: mfa_amr_claims; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: mfa_factors; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: mfa_challenges; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: oauth_authorizations; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: oauth_client_states; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: oauth_consents; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: one_time_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: sso_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: saml_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: saml_relay_states; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: sso_domains; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: webauthn_challenges; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: webauthn_credentials; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: colors; Type: TABLE DATA; Schema: catalog; Owner: postgres
--



--
-- Data for Name: part_categories; Type: TABLE DATA; Schema: catalog; Owner: postgres
--



--
-- Data for Name: parts; Type: TABLE DATA; Schema: catalog; Owner: postgres
--



--
-- Data for Name: elements; Type: TABLE DATA; Schema: catalog; Owner: postgres
--



--
-- Data for Name: themes; Type: TABLE DATA; Schema: catalog; Owner: postgres
--



--
-- Data for Name: sets; Type: TABLE DATA; Schema: catalog; Owner: postgres
--



--
-- Data for Name: inventories; Type: TABLE DATA; Schema: catalog; Owner: postgres
--



--
-- Data for Name: minifigs; Type: TABLE DATA; Schema: catalog; Owner: postgres
--



--
-- Data for Name: inventory_minifigs; Type: TABLE DATA; Schema: catalog; Owner: postgres
--



--
-- Data for Name: inventory_parts; Type: TABLE DATA; Schema: catalog; Owner: postgres
--



--
-- Data for Name: inventory_sets; Type: TABLE DATA; Schema: catalog; Owner: postgres
--



--
-- Data for Name: part_relationships; Type: TABLE DATA; Schema: catalog; Owner: postgres
--



--
-- Data for Name: themes; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."themes" ("id", "name", "slug", "created_at") VALUES
	('a0000001-0000-4000-8000-000000000001', 'Icons', 'icons', '2026-06-05 03:14:32.915826+00'),
	('a0000001-0000-4000-8000-000000000002', 'Creator Expert', 'creator-expert', '2026-06-05 03:14:32.915826+00');


--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."products" ("product_number", "name", "msrp", "status", "release_date", "theme_id", "image_url", "notes", "created_at", "updated_at", "catalog_set_num") VALUES
	('10316', '스누피와 우드스톡', 169900, 'on_sale', '2024-02-01', 'a0000001-0000-4000-8000-000000000001', NULL, NULL, '2026-06-05 03:14:32.915826+00', '2026-06-05 03:14:32.915826+00', NULL),
	('10294', 'Ghostbusters ECTO-1', 269900, 'retiring_soon', '2021-06-01', 'a0000001-0000-4000-8000-000000000002', NULL, NULL, '2026-06-05 03:14:32.915826+00', '2026-06-05 03:14:32.915826+00', NULL);


--
-- Data for Name: retailers; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."retailers" ("id", "name", "slug", "logo_url", "base_url", "created_at") VALUES
	('b0000001-0000-4000-8000-000000000001', '쿠팡', 'coupang', NULL, 'https://www.coupang.com', '2026-06-05 03:14:32.915826+00'),
	('b0000001-0000-4000-8000-000000000002', '11번가', '11st', NULL, 'https://www.11st.co.kr', '2026-06-05 03:14:32.915826+00'),
	('b0000001-0000-4000-8000-000000000003', 'G마켓', 'gmarket', NULL, 'https://www.gmarket.co.kr', '2026-06-05 03:14:32.915826+00');


--
-- Data for Name: product_listings; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."product_listings" ("id", "product_number", "retailer_id", "sale_price", "shipping_fee", "product_url", "in_stock", "last_checked_at", "created_at") VALUES
	('c0000001-0000-4000-8000-000000000001', '10316', 'b0000001-0000-4000-8000-000000000001', 152000, 0, 'https://www.coupang.com/example-10316', true, '2026-06-05 03:14:32.915826+00', '2026-06-05 03:14:32.915826+00'),
	('c0000001-0000-4000-8000-000000000002', '10316', 'b0000001-0000-4000-8000-000000000002', 154900, 3000, 'https://www.11st.co.kr/example-10316', true, '2026-06-05 03:14:32.915826+00', '2026-06-05 03:14:32.915826+00'),
	('c0000001-0000-4000-8000-000000000003', '10316', 'b0000001-0000-4000-8000-000000000003', 149000, 0, 'https://www.gmarket.co.kr/example-10316', true, '2026-06-05 03:14:32.915826+00', '2026-06-05 03:14:32.915826+00'),
	('c0000001-0000-4000-8000-000000000004', '10294', 'b0000001-0000-4000-8000-000000000001', 289000, 0, 'https://www.coupang.com/example-10294', false, '2026-06-05 03:14:32.915826+00', '2026-06-05 03:14:32.915826+00');


--
-- Data for Name: listing_discount_rules; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."listing_discount_rules" ("id", "listing_id", "rule_type", "label", "percent", "fixed_amount", "apply_order", "is_active", "created_at") VALUES
	('9cb1c53d-1fa5-46a9-b773-9daf343aad2a', 'c0000001-0000-4000-8000-000000000001', 'instant', '즉시할인 3%', 3.00, NULL, 1, true, '2026-06-05 03:14:32.915826+00'),
	('249c78ed-7810-4e57-b0bc-e9edd2e91127', 'c0000001-0000-4000-8000-000000000001', 'card_charge', 'SS카드 청구 7%', 7.00, NULL, 2, true, '2026-06-05 03:14:32.915826+00'),
	('d5215278-7602-43f2-9976-81e13f944eee', 'c0000001-0000-4000-8000-000000000001', 'cashback', '쿠팡캐시 2%', 2.00, NULL, 3, true, '2026-06-05 03:14:32.915826+00'),
	('ab6572f4-ecc3-4ede-9f77-b871047f7239', 'c0000001-0000-4000-8000-000000000002', 'other', '쿠폰 5,000원', NULL, 5000, 1, true, '2026-06-05 03:14:32.915826+00'),
	('e30ce00a-878f-4f0b-9a18-47d8d1b14aa1', 'c0000001-0000-4000-8000-000000000002', 'card_charge', '삼성카드 5%', 5.00, NULL, 2, true, '2026-06-05 03:14:32.915826+00'),
	('1a507420-dfea-46b0-b04b-2c55d812b630', 'c0000001-0000-4000-8000-000000000003', 'instant', 'G마켓 할인 5%', 5.00, NULL, 1, true, '2026-06-05 03:14:32.915826+00');


--
-- Data for Name: sales_records; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: sourcing_records; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: buckets; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: buckets_analytics; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: buckets_vectors; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: iceberg_namespaces; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: iceberg_tables; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: objects; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: s3_multipart_uploads; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: s3_multipart_uploads_parts; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: vector_indexes; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: hooks; Type: TABLE DATA; Schema: supabase_functions; Owner: supabase_functions_admin
--



--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE SET; Schema: auth; Owner: supabase_auth_admin
--

SELECT pg_catalog.setval('"auth"."refresh_tokens_id_seq"', 1, false);


--
-- Name: hooks_id_seq; Type: SEQUENCE SET; Schema: supabase_functions; Owner: supabase_functions_admin
--

SELECT pg_catalog.setval('"supabase_functions"."hooks_id_seq"', 1, false);


--
-- PostgreSQL database dump complete
--

-- \unrestrict mPOuZLBH8iEU4QAbRU4XX54atZw6azKsuLssc2nHNba48fitGqs58FhkGKzd5xd

RESET ALL;
