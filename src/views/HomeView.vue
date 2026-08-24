<script setup>
import { RouterLink } from 'vue-router'
import { useListings } from '../composables/useListings'
import MarketTag from '../components/MarketTag.vue'

const { totalItems, totalKgDiverted, businessListings } = useListings()
</script>

<template>
  <div>
    <!-- Hero -->
    <section class="hero section-pad">
      <div class="container">
        <div class="row align-items-center g-5">
          <div class="col-12 col-lg-7">
            <span class="market-tag mb-3"><i class="bi bi-geo-alt"></i> Melbourne, VIC</span>
            <h1 class="display-1-custom mb-3">
              Your spare shelf is<br />someone else's fix.
            </h1>
            <p class="lead text-soft mb-4" style="max-width: 46ch;">
              EcoLoop is a local exchange where residents and small businesses
              give, swap and resell what they don't need — before it ever
              reaches a landfill.
            </p>
            <div class="d-flex flex-wrap gap-2">
              <RouterLink to="/browse" class="btn btn-primary btn-lg">Browse listings</RouterLink>
              <RouterLink to="/post-item" class="btn btn-ghost btn-lg">Post an item</RouterLink>
            </div>

            <div class="d-flex flex-wrap gap-4 mt-5 pt-2">
              <div>
                <div class="stat-figure fs-3">{{ totalKgDiverted }}<span class="fs-6 text-faint"> kg</span></div>
                <div class="text-faint small">diverted from landfill</div>
              </div>
              <div>
                <div class="stat-figure fs-3">{{ totalItems }}</div>
                <div class="text-faint small">items currently listed</div>
              </div>
              <div>
                <div class="stat-figure fs-3">{{ businessListings.length }}</div>
                <div class="text-faint small">business surplus listings</div>
              </div>
            </div>
          </div>

          <div class="col-12 col-lg-5">
            <div class="hero-crate crate-card p-4">
              <div class="d-flex justify-content-between align-items-start mb-3">
                <span class="eyebrow">Fresh nearby</span>
                <MarketTag variant="free" rotate-right>FREE</MarketTag>
              </div>
              <div class="placeholder-thumb rounded mb-3" style="--cat-color:#5C7A5B; aspect-ratio: 16/10;">
                <i class="bi bi-house-door"></i>
              </div>
              <h3 class="h6 mb-1">Timber toddler bed frame</h3>
              <p class="text-soft small mb-0">1.2 km away · Box Hill · Weekday evenings</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Two sides -->
    <section class="section-pad kraft-panel">
      <div class="container">
        <div class="eyebrow mb-2">Two sides, one loop</div>
        <h2 class="h3 mb-5" style="max-width: 34ch;">Built for people clearing a shelf, and shops clearing a stockroom.</h2>
        <div class="row g-4">
          <div class="col-12 col-md-4">
            <div class="crate-card p-4 h-100">
              <i class="bi bi-house-heart fs-3 text-primary-emphasis" style="color: var(--primary);"></i>
              <h3 class="h6 mt-3">For time-poor givers</h3>
              <p class="text-soft small mb-0">
                List an outgrown item in under two minutes, set it free or for a
                few dollars, and pick a public pickup spot that feels safe.
              </p>
            </div>
          </div>
          <div class="col-12 col-md-4">
            <div class="crate-card p-4 h-100">
              <i class="bi bi-search fs-3" style="color: var(--rust);"></i>
              <h3 class="h6 mt-3">For budget-conscious finders</h3>
              <p class="text-soft small mb-0">
                Filter by distance and category, get notified when something
                free appears nearby, and message the lister directly.
              </p>
            </div>
          </div>
          <div class="col-12 col-md-4">
            <div class="crate-card p-4 h-100">
              <i class="bi bi-shop fs-3" style="color: #8C6A3E;"></i>
              <h3 class="h6 mt-3">For local businesses</h3>
              <p class="text-soft small mb-0">
                Bulk-upload weekly surplus with a CSV, save it as a recurring
                template, and export impact figures for your sustainability story.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- How it works -->
    <section id="how-it-works" class="section-pad">
      <div class="container">
        <div class="eyebrow mb-2">How it works</div>
        <h2 class="h3 mb-5">Three steps, start to pickup.</h2>
        <div class="row g-4">
          <div v-for="(step, i) in [
            { title: 'List or browse', body: 'Post a photo and a two-line description, or filter nearby listings by category and distance.' },
            { title: 'Request & agree', body: 'Send a short message, agree a pickup window, and the lister confirms.' },
            { title: 'Collect nearby', body: 'Meet at a home or a suggested public spot — no shipping, no waste.' },
          ]" :key="i" class="col-12 col-md-4">
            <div class="d-flex align-items-center gap-2 mb-2">
              <span class="step-number">{{ String(i + 1).padStart(2, '0') }}</span>
              <h3 class="h6 mb-0">{{ step.title }}</h3>
            </div>
            <p class="text-soft small mb-0">{{ step.body }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- About -->
    <section id="about" class="section-pad kraft-panel">
      <div class="container">
        <div class="row g-5 align-items-center">
          <div class="col-12 col-lg-7">
            <div class="eyebrow mb-2">About EcoLoop</div>
            <h2 class="h3 mb-3">Built by GreenLoop Collective for one Melbourne neighbourhood at a time.</h2>
            <p class="text-soft mb-0" style="max-width: 60ch;">
              Apps built for individuals rarely handle business volumes, and
              tools built for business exclude everyday residents. EcoLoop
              exists in between — a shared, trust-based marketplace where a
              household giveaway and a café's surplus stock can sit on the
              same street.
            </p>
          </div>
          <div class="col-12 col-lg-5">
            <div class="crate-card p-4">
              <div class="eyebrow mb-2">Our five commitments</div>
              <ul class="list-unstyled small text-soft d-flex flex-column gap-2 mb-0">
                <li><i class="bi bi-check2 me-2" style="color: var(--primary);"></i>Free listings stay free, always</li>
                <li><i class="bi bi-check2 me-2" style="color: var(--primary);"></i>ID checks and ratings for safer pickups</li>
                <li><i class="bi bi-check2 me-2" style="color: var(--primary);"></i>Visible impact — kg diverted, items reused</li>
                <li><i class="bi bi-check2 me-2" style="color: var(--primary);"></i>A separate, efficient tool for business surplus</li>
                <li><i class="bi bi-check2 me-2" style="color: var(--primary);"></i>Community guidelines that are actually enforced</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA -->
    <section class="section-pad text-center">
      <div class="container">
        <h2 class="h3 mb-3">Have something sitting in the garage?</h2>
        <RouterLink to="/post-item" class="btn btn-primary btn-lg">Post your first item</RouterLink>
      </div>
    </section>
  </div>
</template>

<style scoped>
.display-1-custom {
  font-family: var(--font-display);
  font-weight: 600;
  font-size: clamp(2.1rem, 4.4vw, 3.4rem);
  line-height: 1.08;
  letter-spacing: -0.015em;
}
.hero { background: var(--bg); }
.hero-crate { transform: rotate(1deg); }
.step-number {
  font-family: var(--font-mono);
  font-weight: 600;
  color: var(--rust);
  font-size: 1.1rem;
}
</style>
