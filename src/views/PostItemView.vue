<script setup>
import { reactive, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { categories } from '../data/categories'
import { useListings } from '../composables/useListings'
import { useLocalStorage } from '../composables/useLocalStorage'
import { required, minLength, isPositiveNumber, runValidators } from '../utils/validators'

const router = useRouter()
const { addListing } = useListings()
const drafts = useLocalStorage('ecoloop_drafts', [])

const step = ref('details') // 'details' | 'pickup'

const form = reactive({
  title: '',
  condition: '',
  category: '',
  description: '',
  listingType: 'free', // 'free' | 'sale'
  price: '',
  pickupPoint: '',
  weekdayEvenings: false,
  weekends: false,
})

const photos = ref([]) // { name, url }
const touched = reactive({})
const submitted = ref(false)
const successMessage = ref('')

function onPhotosSelected(event) {
  const files = Array.from(event.target.files || []).slice(0, 6 - photos.value.length)
  files.forEach((file) => {
    photos.value.push({ name: file.name, url: URL.createObjectURL(file) })
  })
  event.target.value = ''
}
function removePhoto(index) {
  photos.value.splice(index, 1)
}

// ---- Field-level validators (BR B.1: required, length, numeric) ----
const errors = computed(() => ({
  title: runValidators(form.title, [required, minLength(3)]),
  condition: runValidators(form.condition, [required]),
  category: runValidators(form.category, [required]),
  description: runValidators(form.description, [required, minLength(10)]),
  photos: photos.value.length === 0 ? 'Add at least one photo.' : '',
  price: form.listingType === 'sale' ? runValidators(form.price, [required, isPositiveNumber]) : '',
  pickupPoint: runValidators(form.pickupPoint, [required]),
  availability:
    !form.weekdayEvenings && !form.weekends ? 'Choose at least one pickup availability.' : '',
}))

const detailsFields = ['title', 'condition', 'category', 'description', 'photos', 'price']
const pickupFields = ['pickupPoint', 'availability']

const detailsHasErrors = computed(() => detailsFields.some((f) => errors.value[f]))
const pickupHasErrors = computed(() => pickupFields.some((f) => errors.value[f]))

function showError(field) {
  return submitted.value || touched[field] ? errors.value[field] : ''
}
function touch(field) {
  touched[field] = true
}

function goToPickup() {
  detailsFields.forEach(touch)
  if (!detailsHasErrors.value) step.value = 'pickup'
}

function saveDraft() {
  drafts.value = [
    ...drafts.value,
    { ...form, photoCount: photos.value.length, savedAt: new Date().toISOString() },
  ]
  successMessage.value = 'Draft saved — find it later from My Account.'
  setTimeout(() => (successMessage.value = ''), 3500)
}

function publish() {
  submitted.value = true
  detailsFields.forEach(touch)
  pickupFields.forEach(touch)

  if (detailsHasErrors.value) {
    step.value = 'details'
    return
  }
  if (pickupHasErrors.value) {
    step.value = 'pickup'
    return
  }

  const availability = [
    form.weekdayEvenings ? 'Weekday evenings' : null,
    form.weekends ? 'Weekends' : null,
  ].filter(Boolean).join(' & ')

  addListing({
    title: form.title.trim(),
    condition: form.condition,
    category: form.category,
    description: form.description.trim(),
    isFree: form.listingType === 'free',
    price: form.listingType === 'sale' ? Number(form.price) : null,
    distanceKm: 0.5,
    ownerType: 'individual',
    ownerName: 'You',
    suburb: form.pickupPoint,
    pickupWindow: availability,
  })

  router.push('/browse')
}
</script>

<template>
  <div class="section-pad">
    <div class="container" style="max-width: 760px;">
      <div class="eyebrow mb-1">List an item</div>
      <h1 class="h3 mb-4">Post an item</h1>

      <!-- Step tabs -->
      <div class="d-flex gap-2 mb-4">
        <button
          class="btn btn-sm"
          :class="step === 'details' ? 'btn-primary' : 'btn-ghost'"
          @click="step = 'details'"
        >
          1. Details
          <i v-if="submitted && detailsHasErrors" class="bi bi-exclamation-circle-fill text-danger ms-1"></i>
        </button>
        <button
          class="btn btn-sm"
          :class="step === 'pickup' ? 'btn-primary' : 'btn-ghost'"
          @click="step = 'pickup'"
        >
          2. Pickup & Publish
          <i v-if="submitted && pickupHasErrors" class="bi bi-exclamation-circle-fill text-danger ms-1"></i>
        </button>
      </div>

      <transition name="fade" mode="out-in">
      <!-- Step 1: Details -->
      <div v-if="step === 'details'" key="details" class="crate-card p-4">
        <div class="row g-3">
          <div class="col-12 col-md-7">
            <label class="field-label" for="title">Item title</label>
            <input
              id="title" v-model="form.title" type="text" class="form-control"
              :class="{ 'is-invalid': showError('title') }"
              placeholder="e.g. Timber toddler bed frame"
              @blur="touch('title')"
            />
            <p v-if="showError('title')" class="field-error"><i class="bi bi-exclamation-circle"></i>{{ errors.title }}</p>
          </div>
          <div class="col-12 col-md-5">
            <label class="field-label" for="condition">Condition</label>
            <select id="condition" v-model="form.condition" class="form-select" :class="{ 'is-invalid': showError('condition') }" @blur="touch('condition')">
              <option value="" disabled>Select condition</option>
              <option>New</option>
              <option>Like New</option>
              <option>Used</option>
            </select>
            <p v-if="showError('condition')" class="field-error"><i class="bi bi-exclamation-circle"></i>{{ errors.condition }}</p>
          </div>

          <div class="col-12 col-md-7">
            <label class="field-label" for="category">Category</label>
            <select id="category" v-model="form.category" class="form-select" :class="{ 'is-invalid': showError('category') }" @blur="touch('category')">
              <option value="" disabled>Select category</option>
              <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.label }}</option>
            </select>
            <p v-if="showError('category')" class="field-error"><i class="bi bi-exclamation-circle"></i>{{ errors.category }}</p>
          </div>

          <div class="col-12">
            <label class="field-label" for="description">Description</label>
            <textarea
              id="description" v-model="form.description" rows="4" class="form-control"
              :class="{ 'is-invalid': showError('description') }"
              placeholder="Tell people what it is, its condition, and anything they should know."
              @blur="touch('description')"
            ></textarea>
            <p v-if="showError('description')" class="field-error"><i class="bi bi-exclamation-circle"></i>{{ errors.description }}</p>
          </div>

          <div class="col-12">
            <label class="field-label">Photos</label>
            <div class="d-flex flex-wrap gap-2">
              <div v-for="(photo, i) in photos" :key="photo.url" class="photo-thumb">
                <img :src="photo.url" :alt="photo.name" />
                <button class="photo-thumb__remove" type="button" aria-label="Remove photo" @click="removePhoto(i)">
                  <i class="bi bi-x"></i>
                </button>
              </div>
              <label v-if="photos.length < 6" class="photo-add">
                <i class="bi bi-plus-lg"></i>
                <span class="small">Add photos</span>
                <input type="file" accept="image/*" multiple hidden @change="onPhotosSelected" @blur="touch('photos')" />
              </label>
            </div>
            <p v-if="showError('photos')" class="field-error"><i class="bi bi-exclamation-circle"></i>{{ errors.photos }}</p>
          </div>

          <div class="col-12">
            <label class="field-label">Listing type</label>
            <div class="d-flex align-items-center gap-2 flex-wrap">
              <div class="btn-group" role="group">
                <input id="typeFree" v-model="form.listingType" type="radio" class="btn-check" value="free" />
                <label class="btn btn-ghost btn-sm" for="typeFree">Free</label>
                <input id="typeSale" v-model="form.listingType" type="radio" class="btn-check" value="sale" />
                <label class="btn btn-ghost btn-sm" for="typeSale">For Sale</label>
              </div>
              <div v-if="form.listingType === 'sale'" style="width: 140px;">
                <div class="input-group input-group-sm">
                  <span class="input-group-text">$</span>
                  <input
                    v-model="form.price" type="number" min="0" step="0.5" class="form-control"
                    :class="{ 'is-invalid': showError('price') }"
                    placeholder="0.00"
                    @blur="touch('price')"
                  />
                </div>
              </div>
            </div>
            <p v-if="showError('price')" class="field-error"><i class="bi bi-exclamation-circle"></i>{{ errors.price }}</p>
          </div>
        </div>

        <div class="d-flex justify-content-end mt-4">
          <button class="btn btn-primary" @click="goToPickup">Next: Pickup & Publish</button>
        </div>
      </div>

      <!-- Step 2: Pickup & Publish -->
      <div v-else key="pickup" class="crate-card p-4">
        <label class="field-label" for="pickupPoint">Pickup point</label>
        <div class="input-group mb-1">
          <span class="input-group-text"><i class="bi bi-geo-alt"></i></span>
          <input
            id="pickupPoint" v-model="form.pickupPoint" type="text" class="form-control"
            :class="{ 'is-invalid': showError('pickupPoint') }"
            placeholder="Suburb or a public meeting point"
            @blur="touch('pickupPoint')"
          />
          <button class="btn btn-ghost" type="button" @click="form.pickupPoint = 'Suggested: Box Hill Library forecourt'">
            Suggest public spot
          </button>
        </div>
        <p v-if="showError('pickupPoint')" class="field-error"><i class="bi bi-exclamation-circle"></i>{{ errors.pickupPoint }}</p>

        <label class="field-label mt-3">Availability</label>
        <div class="d-flex gap-4">
          <div class="form-check">
            <input id="weekdayEvenings" v-model="form.weekdayEvenings" class="form-check-input" type="checkbox" @change="touch('availability')" />
            <label class="form-check-label small" for="weekdayEvenings">Weekday evenings</label>
          </div>
          <div class="form-check">
            <input id="weekends" v-model="form.weekends" class="form-check-input" type="checkbox" @change="touch('availability')" />
            <label class="form-check-label small" for="weekends">Weekends</label>
          </div>
        </div>
        <p v-if="showError('availability')" class="field-error"><i class="bi bi-exclamation-circle"></i>{{ errors.availability }}</p>

        <div class="d-flex justify-content-between mt-4 flex-wrap gap-2">
          <button class="btn btn-ghost" @click="saveDraft">Save draft</button>
          <button class="btn btn-primary" @click="publish">Post item</button>
        </div>
      </div>
      </transition>

      <transition name="fade">
        <div v-if="successMessage" class="eco-toast">
          <i class="bi bi-check-circle"></i>{{ successMessage }}
        </div>
      </transition>
    </div>
  </div>
</template>

<style scoped>
.photo-thumb {
  position: relative;
  width: 84px;
  height: 84px;
  border-radius: var(--radius-sm);
  overflow: hidden;
  border: 1.5px solid var(--line);
}
.photo-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
.photo-thumb__remove {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: none;
  background: rgba(35,36,32,0.7);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  padding: 0;
}
.photo-add {
  width: 84px;
  height: 84px;
  border-radius: var(--radius-sm);
  border: 1.5px dashed var(--line);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  color: var(--ink-soft);
  cursor: pointer;
  background: var(--bg-kraft);
}
.photo-add:hover { border-color: var(--primary); color: var(--primary); }
</style>
