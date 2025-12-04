/**
 * Global CDN Configuration for SnapifY
 * Multi-region CDN implementation with edge caching and dynamic content optimization
 */

const CDN_CONFIG = {
    // CDN Provider Configuration
    provider: 'cloudflare', // Options: cloudflare, aws-cloudfront, fastly, akamai
    zones: {
        // Multi-region zones for global coverage
        north_america: {
            id: 'na-zone-1',
            regions: ['us-east-1', 'us-west-1', 'ca-central-1'],
            edge_locations: ['NYC', 'LAX', 'TOR', 'DFW', 'IAD']
        },
        europe: {
            id: 'eu-zone-1',
            regions: ['eu-west-1', 'eu-central-1', 'eu-north-1'],
            edge_locations: ['LHR', 'FRA', 'AMS', 'CDG', 'MAD']
        },
        asia_pacific: {
            id: 'ap-zone-1',
            regions: ['ap-southeast-1', 'ap-northeast-1', 'ap-south-1'],
            edge_locations: ['SIN', 'NRT', 'SYD', 'BOM', 'HKG']
        },
        middle_east_africa: {
            id: 'mea-zone-1',
            regions: ['me-south-1', 'af-south-1'],
            edge_locations: ['DXB', 'JNB', 'RIY']
        }
    },

    // Content Delivery Strategy
    content_types: {
        static_assets: {
            patterns: ['*.js', '*.css', '*.png', '*.jpg', '*.jpeg', '*.gif', '*.ico', '*.svg', '*.woff2', '*.ttf'],
            cache_ttl: 31536000, // 1 year for immutable assets
            cache_control: 'public, immutable',
            compression: ['gzip', 'brotli'],
            edge_caching: true
        },
        dynamic_content: {
            patterns: ['/api/*'],
            cache_ttl: 3600, // 1 hour for API responses
            cache_control: 'public, max-age=3600, stale-while-revalidate=1800',
            compression: ['gzip'],
            edge_caching: true
        },
        media_content: {
            patterns: ['/media/*', '*.mp4', '*.mov', '*.avi', '*.mkv', '*.webm'],
            cache_ttl: 86400, // 24 hours for media files
            cache_control: 'public, max-age=86400',
            compression: ['gzip'],
            edge_caching: true,
            optimization: {
                images: {
                    formats: ['webp', 'avif'],
                    quality: 85,
                    resize: [320, 640, 1280, 1920]
                },
                videos: {
                    formats: ['mp4', 'webm'],
                    bitrates: [500, 1500, 3000],
                    resolutions: ['480p', '720p', '1080p']
                }
            }
        }
    },

    // Edge Caching Configuration
    edge_caching: {
        enabled: true,
        strategies: {
            static_assets: 'cache-first',
            dynamic_content: 'network-first',
            media_content: 'stale-while-revalidate'
        },
        cache_keys: {
            include_query_params: ['v', 'lang', 'region'],
            exclude_query_params: ['utm_*', 'fbclid', 'gclid']
        },
        cache_size: {
            static_assets: '10GB',
            dynamic_content: '5GB',
            media_content: '50GB'
        }
    },

    // Cache Invalidation Strategy
    cache_invalidation: {
        methods: {
            purge_by_url: {
                enabled: true,
                api_endpoint: '/cdn/purge',
                rate_limit: '100 requests per minute'
            },
            purge_by_tag: {
                enabled: true,
                tags: ['version_*', 'event_*', 'user_*'],
                api_endpoint: '/cdn/purge-by-tag'
            },
            purge_all: {
                enabled: true,
                api_endpoint: '/cdn/purge-all',
                require_auth: true
            }
        },
        automatic_invalidation: {
            on_deploy: true,
            on_content_update: true,
            ttl_based: true
        }
    },

    // Dynamic Content Optimization
    dynamic_content_optimization: {
        intelligent_routing: {
            enabled: true,
            rules: [
                {
                    condition: "user.region === 'eu'",
                    action: "route_to_eu_zone"
                },
                {
                    condition: "user.device === 'mobile'",
                    action: "optimize_for_mobile"
                },
                {
                    condition: "request.headers['save-data'] === 'on'",
                    action: "apply_data_saver_mode"
                }
            ]
        },
        response_optimization: {
            minify_json: true,
            compress_responses: true,
            remove_unused_fields: true
        }
    },

    // Media Optimization Pipeline
    media_optimization: {
        image_processing: {
            pipeline: [
                'resize',
                'format_conversion',
                'quality_optimization',
                'metadata_stripping',
                'lazy_loading_preparation'
            ],
            presets: {
                thumbnail: { width: 320, height: 320, quality: 75, format: 'webp' },
                standard: { width: 1280, height: 720, quality: 85, format: 'webp' },
                high_res: { width: 1920, height: 1080, quality: 90, format: 'avif' }
            }
        },
        video_processing: {
            pipeline: [
                'transcoding',
                'bitrate_adaptation',
                'format_conversion',
                'thumbnail_generation',
                'metadata_optimization'
            ],
            presets: {
                mobile: { resolution: '480p', bitrate: '500kbps', format: 'mp4' },
                tablet: { resolution: '720p', bitrate: '1500kbps', format: 'mp4' },
                desktop: { resolution: '1080p', bitrate: '3000kbps', format: 'webm' }
            }
        },
        automated_optimization: {
            triggers: {
                on_upload: true,
                on_demand: true,
                scheduled: 'daily'
            },
            storage: {
                originals: 's3://snapify-originals',
                optimized: 's3://snapify-optimized',
                backups: 's3://snapify-backups'
            }
        }
    },

    // Security Configuration
    security: {
        https: {
            enabled: true,
            tls_version: 'TLSv1.3',
            hsts: {
                enabled: true,
                max_age: 31536000,
                include_subdomains: true,
                preload: true
            }
        },
        ddos_protection: {
            enabled: true,
            rate_limiting: {
                requests_per_second: 1000,
                burst_capacity: 2000
            }
        },
        origin_shield: {
            enabled: true,
            regions: ['us-east-1', 'eu-west-1', 'ap-southeast-1']
        }
    },

    // Monitoring and Analytics
    monitoring: {
        real_time_metrics: {
            enabled: true,
            metrics: ['hit_rate', 'bandwidth', 'latency', 'error_rate']
        },
        logging: {
            enabled: true,
            retention_days: 30,
            sample_rate: 0.1
        },
        alerts: {
            high_latency: { threshold: '500ms', notification: 'email+sms' },
            high_error_rate: { threshold: '5%', notification: 'email+pager' },
            cache_miss_rate: { threshold: '30%', notification: 'email' }
        }
    },

    // Performance Optimization
    performance: {
        prefetching: {
            enabled: true,
            strategies: ['dns-prefetch', 'preconnect', 'preload']
        },
        http2: {
            enabled: true,
            push_resources: ['/assets/*', '/fonts/*']
        },
        brotli_compression: {
            enabled: true,
            quality: 11,
            min_size: 1024
        }
    },

    // Backward Compatibility
    backward_compatibility: {
        legacy_support: {
            user_agent_detection: true,
            fallback_mechanisms: {
                no_webp: 'jpeg',
                no_http2: 'http1.1',
                no_brotli: 'gzip'
            }
        },
        cache_busting: {
            query_param: 'v',
            header_based: 'ETag'
        }
    }
};

export default CDN_CONFIG;