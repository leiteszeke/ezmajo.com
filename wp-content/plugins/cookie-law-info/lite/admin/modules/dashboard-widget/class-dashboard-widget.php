<?php
/**
 * Class Dashboard_Widget file.
 *
 * @package CookieYes
 */

namespace CookieYes\Lite\Admin\Modules\Dashboard_Widget;

use CookieYes\Lite\Includes\Modules;

if ( ! defined( 'ABSPATH' ) ) {
    exit; // Exit if accessed directly.
}

/**
 * Handles Dashboard Widget Operation
 *
 * @class       Dashboard_Widget
 * @version     3.0.0
 * @package     CookieYes
 */
class Dashboard_Widget extends Modules {
    /**
     * Endpoint namespace.
     *
     * @var string
     */
    protected $namespace = 'cky/v1';

    /**
     * Route base.
     *
     * @var string
     */
    protected $rest_base = '/dashboard-widget';

    /**
     * Constructor.
     *
     * @param string $module_id Module identifier from admin loader.
     */
    public function __construct( $module_id = 'dashboard_widget' ) {
        parent::__construct( $module_id );
        add_action( 'admin_enqueue_scripts', array( $this, 'enqueue_scripts' ) );
    }

    /**
     * Enqueue required scripts
     */
    public function enqueue_scripts( $hook ) {
        if ( 'index.php' !== $hook ) {
            return;
        }
        if (!current_user_can('manage_options')) {
            return;
        }

        $script_suffix = defined( 'SCRIPT_DEBUG' ) && SCRIPT_DEBUG ? '' : '.min';
        wp_enqueue_script(
            'cky-chart',
            plugin_dir_url( __FILE__ ) . 'assets/js/chart' . $script_suffix . '.js',
            array(),
            '4.4.1',
            true
        );
    }

    /**
     * Initialize the class
     */
    public function init() {
        add_action( 'wp_dashboard_setup', array( $this, 'add_cookieyes_dashboard_widget' ) );
    }

    /**
     * Add the CookieYes dashboard widget.
     */
    public function add_cookieyes_dashboard_widget() {
        if (!current_user_can('manage_options')) {
            return;
        }
        wp_add_dashboard_widget(
            'cookieyes_dashboard_widget',
            __( 'CookieYes', 'cookie-law-info' ),
            array( $this, 'render_cookieyes_dashboard_widget' )
        );
    }

    /**
     * Render the CookieYes dashboard widget.
     */
    public function render_cookieyes_dashboard_widget() {
        if (!current_user_can('manage_options')) {
            return;
        }
        $connected = false;
        if ( class_exists( 'CookieYes\\Lite\\Admin\\Modules\\Settings\\Includes\\Settings' ) ) {
            $settings = \CookieYes\Lite\Admin\Modules\Settings\Includes\Settings::get_instance();
            $connected = ! empty( $settings->get_website_id() );
        } else {
            $connected = get_option( 'cky_webapp_connected' );
        }

        if ( ! $connected ) {
            $this->render_dashboard_widget_disconnected();
        } else {
            $this->render_dashboard_widget_connected();
        }
    }

    /**
     * Render the widget for disconnected state.
     */
    private function render_dashboard_widget_disconnected() {
        ?>
        <div class="cky-consent-chart-section">
            <div class="cky-consent-chart cky-blur">
                <img 
                    src="<?php echo esc_url( plugin_dir_url( __FILE__ ) . 'assets/img/trends.svg' ); ?>" 
                    alt="<?php esc_attr_e( 'Consent trends preview', 'cookie-law-info' ); ?>"
                    style="display:block;width:100%;height:auto;"
                />
                <div class="cky-modal-overlay">
                    <div class="cky-modal-content">
                        <b><?php esc_html_e( 'Get cookie consent insights in your Dashboard!', 'cookie-law-info' ); ?></b>
                        <p><?php esc_html_e( 'Track your consent rates and unlock advanced features that keep your site in check.', 'cookie-law-info' ); ?></p>
                        <a href="<?php echo esc_url( admin_url( 'admin.php?page=cookie-law-info' ) ); ?>" class="button button-primary">
                            <?php esc_html_e( 'Connect to CookieYes Web App', 'cookie-law-info' ); ?>
                        </a>
                    </div>
                </div>
            </div>
        </div>
        <style>
            .cky-consent-chart-section {
                position: relative;
                min-height: 250px;
                margin: 0px -12px -12px -12px;
            }
            .cky-modal-overlay {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10;
            }
            .cky-modal-content {
                background: #fff;
                border-radius: 16px;
                box-shadow: 0px 2px 12.3px 0px rgba(114, 174, 230, 0.25);
                padding: 32px 8px;
                max-width: 350px;
                text-align: center;
                z-index: 11;
            }
            .cky-modal-content b {
                display: block;
                margin-bottom: 12px;
                font-size: 16px;
                font-weight: 600;
                line-height: 24px;
            }
            .cky-modal-content p {
                font-size: 13px;
                font-weight: 400;
                line-height: 18px;
                margin-bottom: 20px;
            }
            .cky-modal-content .button.button-primary {
                padding: 8px 16px;
                line-height: normal;
                font-size: 15px;
                min-height: 30px;
            }
        </style>
        <?php
    }

    /**
     * Render the widget for connected state.
     */
    private function render_dashboard_widget_connected() {
        ?>
        <div class="cky-consent-chart-widget" id="cky-dashboard-widget-chart">
            <div class="cky-chart-container" id="cky-dashboard-widget-chart-container">
                <div id="cky-chart-loader" class="cky-card-loader-container" style="display:flex;">
                    <div class="cky-card-loader">
                        <div class="cky-card-loader--line"></div>
                        <div class="cky-card-loader--line"></div>
                        <div class="cky-card-loader--line"></div>
                        <div class="cky-card-loader--line"></div>
                        <div class="cky-card-loader--line cky-card-loader--rect"></div>
                    </div>
                </div>
                <canvas id="cky-pie-chart-widget" width="320" height="320" style="display:none;width:100%;height:auto;"></canvas>
                <div class="cky-center-total-consents" style="display:none;">
                    <span class="cky-center-total-consents-value"></span>
                    <div class="cky-center-total-consents-label">Total Consents</div>
                </div>
                <div id="cky-no-consents-placeholder" style="display:none;text-align:center;padding:40px 0;">
                    <svg width="110" height="110" viewBox="0 0 110 110" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="55" cy="55" r="55" fill="#E5E7EA"/>
                        <circle cx="38" cy="54" r="9" fill="#FFFFFF"/>
                        <circle cx="55" cy="80" r="5" fill="#FFFFFF"/>
                        <circle cx="75" cy="45" r="11" fill="#FFFFFF"/>
                        <circle cx="55" cy="30" r="5" fill="#FFFFFF"/>
                        
                    </svg>
                    <p style="font-size:20px;color:#656178;margin-top:20px;">No consents were logged</p>
                </div>
                <div id="cky-api-error-placeholder" style="display:none;text-align:center;padding:40px 0;">
                    <svg width="110" height="110" viewBox="0 0 110 110" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="55" cy="55" r="55" fill="#E5E7EA"/>
                        <circle cx="38" cy="54" r="9" fill="#FFFFFF"/>
                        <circle cx="55" cy="80" r="5" fill="#FFFFFF"/>
                        <circle cx="75" cy="45" r="11" fill="#FFFFFF"/>
                        <circle cx="55" cy="30" r="5" fill="#FFFFFF"/>
                        
                    </svg>
                    <p style="font-size:20px;color:#656178;margin-top:20px;"><?php esc_html_e( 'Unable to load consent trends. Please try again later.', 'cookie-law-info' ); ?></p>
                </div>
            </div>
            <div class="cky-consent-legend" id="cky-consent-legend" style="display:none;">
                <div class="cky-legend-item"><span class="cky-legend-color cky-legend-accepted"></span>Accepted</div>
                <div class="cky-legend-item"><span class="cky-legend-color cky-legend-rejected"></span>Rejected</div>
                <div class="cky-legend-item"><span class="cky-legend-color cky-legend-partial"></span>Partially Accepted</div>
            </div>
        </div>
        <script>
        (function(){
            function initChart() {
                const TIMEOUT_MS = <?php echo esc_js( 180 * 1000 ); ?>;
                let controller = null;
                let timeoutId = null;

                let loading = true;
                let data = [];

                function getCount(consents, type) {
                    let consent = false;
                    if (typeof consents === "object") {
                        consent = consents.find(function (item) {
                            return item.type === type;
                        });
                    }
                    return (consent && consent.count) || 0;
                }

                async function getChartData() {
                    loading = true;
                    data = [];
                    
                    controller = new AbortController();
                    timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

                    try {
                        const response = await fetch('<?php echo esc_url_raw( rest_url() . 'cky/v1/consent_logs/statistics' ); ?>', {
                            method: 'GET',
                            headers: {
                                'X-WP-Nonce': '<?php echo esc_js( wp_create_nonce( 'wp_rest' ) ); ?>'
                            },
                            signal: controller.signal
                        });
                        clearTimeout(timeoutId);

                        if (!response.ok) {
                            throw new Error('API request failed with status: ' + response.status);
                        }

                        data = await response.json();

                        if (data.length <= 0) {
                            loading = false;
                            const loader = document.getElementById('cky-chart-loader');
                            if (loader) {
                                loader.style.display = 'none';
                            }
                            document.getElementById('cky-no-consents-placeholder').style.display = 'block';
                            return;
                        }

                        let responseArr = [getCount(data, "accepted"), getCount(data, "rejected"), getCount(data, "partial")];
                        const total = responseArr.reduce((a, b) => a + b, 0);

                        if (total === 0) {
                            loading = false;
                            const loader = document.getElementById('cky-chart-loader');
                            if (loader) {
                                loader.style.display = 'none';
                            }
                            document.getElementById('cky-no-consents-placeholder').style.display = 'block';
                            return;
                        }

                        if (responseArr && responseArr.length > 0) {
                            const loader = document.getElementById('cky-chart-loader');
                            if (loader) {
                                loader.style.display = 'none';
                            }
                            document.getElementById('cky-pie-chart-widget').style.display = 'block';
                            document.querySelector('.cky-center-total-consents').style.display = 'block';
                            document.getElementById('cky-consent-legend').style.display = 'flex';
                            document.querySelector('.cky-center-total-consents-value').textContent = total;

                            const ctx = document.getElementById('cky-pie-chart-widget').getContext('2d');
                            new window.Chart(ctx, {
                                type: 'doughnut',
                                data: {
                                    labels: ['Accepted', 'Rejected', 'Partially Accepted'],
                                    datasets: [{
                                        data: responseArr,
                                        backgroundColor: ['rgba(51, 168, 129, 0.5)', 'rgba(236, 74, 94, 0.5)', 'rgba(68, 147, 249, 0.5)'],
                                        borderWidth: 0
                                    }]
                                },
                                options: {
                                    cutout: '80%',
                                    plugins: {
                                        legend: { display: false },
                                        tooltip: {
                                            enabled: true,
                                            backgroundColor: '#656178',
                                            titleFont: {
                                                size: 14,
                                                weight: 'bold'
                                            },
                                            bodyFont: {
                                                size: 13
                                            },
                                            padding: 12,
                                            cornerRadius: 8,
                                            displayColors: false,
                                            callbacks: {
                                                label: function(context) {
                                                    const value = context.raw;
                                                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                                    const percentage = Math.round((value / total) * 100);
                                                    return `${context.label}: ${value} (${percentage}%)`;
                                                }
                                            }
                                        }
                                    },
                                    responsive: true,
                                    maintainAspectRatio: false
                                }
                            });
                        }
                    } catch (e) {
                        if (timeoutId) {
                            clearTimeout(timeoutId);
                        }
                        console.error(e);
                        const loader = document.getElementById('cky-chart-loader');
                        if (loader) {
                            loader.style.display = 'none';
                        }
                        const chartContainer = document.getElementById('cky-dashboard-widget-chart-container');
                        const noConsentsPlaceholder = document.getElementById('cky-no-consents-placeholder');
                        const apiErrorPlaceholder = document.getElementById('cky-api-error-placeholder');
                        const consentLegend = document.getElementById('cky-consent-legend');
                        
                        if (chartContainer) {
                            const chartCanvas = document.getElementById('cky-pie-chart-widget');
                            const centerTotal = document.querySelector('.cky-center-total-consents');
                            if (chartCanvas) {
                                chartCanvas.style.display = 'none';
                            }
                            if (centerTotal) {
                                centerTotal.style.display = 'none';
                            }
                            if (noConsentsPlaceholder) {
                                noConsentsPlaceholder.style.display = 'none';
                            }
                            if (consentLegend) {
                                consentLegend.style.display = 'none';
                            }
                            if (apiErrorPlaceholder) {
                                apiErrorPlaceholder.style.display = 'block';
                            }
                        }
                    }

                    loading = false;
                }

                getChartData();
            }

            if (document.readyState === 'complete') {
                initChart();
            } else {
                window.addEventListener('load', initChart);
            }
        })();
        </script>
        <style>
    .cky-consent-chart-widget {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 380px;
    }
    .cky-chart-container {
        position: relative;
        width: 320px;
        height: 320px;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto;
    }
    #cky-pie-chart-widget {
        position: absolute;
        width: 100% !important;
        height: auto !important;
    }
    .cky-center-total-consents {
        position: absolute;
        left: 0;
        right: 0;
        top: 0;
        bottom: 0;
        margin: auto;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        pointer-events: none;
        z-index: 1;
        height: fit-content;
        width: fit-content;
    }
    .cky-center-total-consents-value {
        font-size: 4em;
        font-weight: 700;
        line-height: 1;
        color: #111;
        display: block;
        margin-bottom: 5px;
    }
    .cky-center-total-consents-label {
        font-size: 1.5em;
        font-weight: 400;
        color: #111;
        white-space: nowrap;
    }
    .cky-consent-legend {
    margin-left: 48px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 50px;
}
    .cky-legend-item {
        display: flex;
        align-items: center;
    }
    .cky-legend-color {
        display: inline-block;
        width: 20px;
        height: 20px;
        margin-right: 10px;
        flex-shrink: 0;
    }
    .cky-legend-accepted {
        background: rgba(51, 168, 129, 0.5);
    }
    .cky-legend-rejected {
        background: rgba(236, 74, 94, 0.5);
    }
    .cky-legend-partial {
        background: rgba(68, 147, 249, 0.5);
    }
    .cky-card-loader-container {
        display: flex;
        align-items: center;
        position: absolute;
        z-index: 12;
        top: 0;
        left: 0;
        right: 0;
        width: 100%;
        height: 100%;
        padding: 15px;
        min-height: 114px;
    }
    .cky-card-loader {
        width: 100%;
    }
    .cky-card-loader--line {
        opacity: 0.5;
        background: #f6f7f8;
        background: linear-gradient(to right, #d7e1f2 8%, #c1d1eb 18%, #d7e1f2 33%);
        background-size: 800px 100px;
        border-radius: 3px;
        animation-duration: 1s;
        animation-fill-mode: forwards;
        animation-iteration-count: infinite;
        animation-name: cky-shimmer;
        animation-timing-function: linear;
        height: 10px;
        width: 100%;
    }
    .cky-card-loader--line:nth-child(1) {
        width: 70%;
        height: 15px;
    }
    .cky-card-loader--line:nth-child(2) {
        width: 60%;
    }
    .cky-card-loader--line:not(:first-child) {
        margin-top: 6px;
    }
    .cky-card-loader--rect {
        min-height: 35px;
    }
    @keyframes cky-shimmer {
        0% {
            background-position: -400px 0;
        }
        100% {
            background-position: 400px 0;
        }
    }
</style> 
        <?php
    }
}