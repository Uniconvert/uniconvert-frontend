import { Link } from 'react-router'
import { ROUTE_PATHS } from '@/routes/routePaths'
import styles from './LandingPage.module.css'

const features = [
  {
    title: '오늘의 환율',
    description: (
      <>
        당일 환율을 반영해
        <br />
        언제나 정확한 금액을 제공합니다
      </>
    ),
    image: '/assets/icons/landing_transition.png',
  },
  {
    title: '외화 관리',
    description: (
      <>
        외화를 원화 기준으로
        <br />
        쉽고 직관적으로 관리하세요
      </>
    ),
    image: '/assets/icons/landing_bill.png',
  },
  {
    title: '예산 분석',
    description: (
      <>
        남은 예산과 소비를
        <br />
        한눈에 확인할 수 있습니다
      </>
    ),
    image: '/assets/icons/landing_graph.png',
  },
]

function LandingPage() {
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
              로그인
            </Link>
            <Link className={styles.signUpLink} to={ROUTE_PATHS.signUp}>
              회원가입
            </Link>
          </div>
        </header>

        <div className={styles.heroContent}>
          <h1 id="landing-title" className={styles.title}>
            낯선 나라에서도, 내 돈 감각은 그대로
            <img
              className={styles.titleArrow}
              src="/assets/icons/landing_arrow.png"
              alt=""
              aria-hidden="true"
            />
          </h1>
          <p className={styles.subtitle}>
            매일 <strong>변화하는 환율</strong> 속에서도
            <br />
            내가 <strong>사용할 예산</strong>을 언제나 명확하게
          </p>
          <Link className={styles.startLink} to={ROUTE_PATHS.login}>
            시작하기
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
          우리 서비스 아래와 같은 기능을 제공합니다
        </h2>

        <div className={styles.featureGrid}>
          {features.map((feature) => (
            <article className={styles.featureCard} key={feature.title}>
              <img src={feature.image} alt="" aria-hidden="true" />
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
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
