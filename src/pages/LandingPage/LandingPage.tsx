import { Link } from 'react-router'
import { ROUTE_PATHS } from '@/routes/routePaths'
import styles from './LandingPage.module.css'
import { useI18n } from '@/i18n/I18nContext'

const features = [
  {
    titleKey: 'landing.rateTitle',
    descriptionKey: 'landing.rateDescription',
    image: '/assets/icons/landing_transition.png',
  },
  {
    titleKey: 'landing.moneyTitle',
    descriptionKey: 'landing.moneyDescription',
    image: '/assets/icons/landing_bill.png',
  },
  {
    titleKey: 'landing.budgetTitle',
    descriptionKey: 'landing.budgetDescription',
    image: '/assets/icons/landing_graph.png',
  },
]

function LandingPage() {
  const { t } = useI18n()
  return (
    <main className={styles.page}>
      <section className={styles.hero} aria-labelledby="landing-title">
        <header className={styles.header}>
          <Link className={styles.brand} to={ROUTE_PATHS.landing}>
            <span className={styles.brandMarkFrame} aria-hidden="true">
              <img
                className={styles.brandMarkSource}
                src="/assets/brand/uniconvert-logo-stacked.png"
                alt=""
              />
            </span>
            <img
              className={styles.brandWordmark}
              src="/assets/brand/uniconvert-wordmark.png"
              alt="Uniconvert"
            />
          </Link>

          <div className={styles.authActions}>
            <Link className={styles.loginLink} to={ROUTE_PATHS.login}>
              {t('landing.login')}
            </Link>
            <Link className={styles.signUpLink} to={ROUTE_PATHS.signUp}>
              {t('landing.signup')}
            </Link>
          </div>
        </header>

        <div className={styles.heroContent}>
          <h1 id="landing-title" className={styles.title}>
            {t('landing.title')}
            <img
              className={styles.titleArrow}
              src="/assets/icons/landing_arrow.png"
              alt=""
              aria-hidden="true"
            />
          </h1>
          <p className={styles.subtitle}>
            {t('landing.subtitleBefore')}
            <br />
            {t('landing.subtitleAfter')}
          </p>
          <Link className={styles.startLink} to={ROUTE_PATHS.login}>
            {t('landing.start')}
          </Link>
        </div>

        <img
          className={styles.heroCoin}
          src="/assets/icons/landing_coin.png"
          alt=""
          aria-hidden="true"
        />
        <img
          className={styles.heroGoogle}
          src="/assets/icons/landing_google.png"
          alt=""
          aria-hidden="true"
        />
        <img
          className={styles.heroExchange}
          src="/assets/icons/landing_exchange.png"
          alt=""
          aria-hidden="true"
        />
      </section>

      <section className={styles.features} aria-labelledby="features-title">
        <h2 id="features-title" className={styles.featuresTitle}>
          {t('landing.featuresTitle')}
        </h2>

        <div className={styles.featureGrid}>
          {features.map((feature) => (
            <article className={styles.featureCard} key={feature.titleKey}>
              <img src={feature.image} alt="" aria-hidden="true" />
              <h3>{t(feature.titleKey)}</h3>
              <p>{t(feature.descriptionKey).split('\n').map((line, index) => <span key={line}>{index > 0 && <br />}{line}</span>)}</p>
            </article>
          ))}
        </div>

        <img
          className={styles.featureCoins}
          src="/assets/icons/landing_coins.png"
          alt=""
          aria-hidden="true"
        />
      </section>
    </main>
  )
}

export default LandingPage
