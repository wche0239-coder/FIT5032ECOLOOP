<script setup>
const year = new Date().getFullYear()
</script>

<template>
  <footer class="kraft-panel mt-auto">
    <div class="container py-5">
      <div class="row g-4">
        <div class="col-12 col-lg-4">
          <div class="brand-mark mb-2"><i class="bi bi-arrow-repeat"></i> EcoLoop</div>
          <p class="text-soft small mb-0" style="max-width: 32ch">
            A local exchange for Melbourne residents and small businesses —
            built by GreenLoop Collective to keep good things out of landfill.
          </p>
        </div>
        <div class="col-6 col-lg-2">
          <div class="eyebrow mb-2">For individuals</div>
          <ul class="list-unstyled small d-flex flex-column gap-2">
            <li><router-link to="/post-item" class="text-soft">Post an item</router-link></li>
            <li><router-link to="/browse" class="text-soft">Browse listings</router-link></li>
            <li><router-link to="/signup" class="text-soft">Create account</router-link></li>
          </ul>
        </div>
        <div class="col-6 col-lg-2">
          <div class="eyebrow mb-2">For business</div>
          <ul class="list-unstyled small d-flex flex-column gap-2">
            <li><router-link to="/business" class="text-soft">Business dashboard</router-link></li>
            <li><router-link to="/signup" class="text-soft">Business sign up</router-link></li>
          </ul>
        </div>
        <div class="col-6 col-lg-2">
          <div class="eyebrow mb-2">Company</div>
          <ul class="list-unstyled small d-flex flex-column gap-2">
            <li><router-link to="/#about" class="text-soft">About us</router-link></li>
            <li><router-link to="/#how-it-works" class="text-soft">How it works</router-link></li>
          </ul>
        </div>
        <div class="col-6 col-lg-2">
          <div class="eyebrow mb-2">Follow</div>
          <div class="d-flex gap-3 fs-5 text-soft">
            <i class="bi bi-facebook"></i>
            <i class="bi bi-instagram"></i>
            <i class="bi bi-linkedin"></i>
          </div>
        </div>
      </div>
      <hr class="hairline my-4" />
      <p class="text-faint small mb-0">&copy; {{ year }} EcoLoop · GreenLoop Collective · Melbourne, Australia</p>
    </div>
  </footer>
</template>
