"use client";

import Image, { getImageProps } from "next/image";
import { useEffect, useState } from "react";
import { businessActivities } from "@/lib/business-activities";
import styles from "./business.module.css";

const sizes = "(max-width: 900px) 100vw, 50vw";
const imageProps = (index: number) => ({
  src: `/images/strategies/${businessActivities[index].id}.png`,
  alt: businessActivities[index].imageAlt,
  width: 1536,
  height: 1024,
  sizes,
});

export default function BusinessImageCarousel() {
  const [index, setIndex] = useState(0);
  const [pageVisible, setPageVisible] = useState(true);

  useEffect(() => {
    const update = () => setPageVisible(!document.hidden);
    update();
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);

  useEffect(() => {
    if (!pageVisible) return;
    let canceled = false, loading = false;
    const timer = window.setInterval(async () => {
      if (loading) return;
      loading = true;
      const next = (index + 1) % businessActivities.length;
      try {
        // Decode the same responsive resource before changing the visible image.
        // A slow or failed request leaves the current picture in place.
        const { props } = getImageProps(imageProps(next));
        const preload = new window.Image();
        preload.sizes = sizes;
        preload.srcset = props.srcSet ?? "";
        preload.src = props.src;
        await preload.decode();
        if (!canceled) setIndex(next);
      } catch {
        // Retry on the next interval without replacing the current picture.
      } finally { loading = false; }
    }, 5000);
    return () => { canceled = true; window.clearInterval(timer); };
  }, [index, pageVisible]);

  return (
    <div className={styles.slideshow} role="region" aria-roledescription="carousel" aria-label="Business activity pictures">
      <div className={styles.slideshowFrame} aria-live="off">
        <Image key={businessActivities[index].id} {...imageProps(index)} className={styles.slideshowPicture} />
      </div>
      <div className={styles.slideshowControls}>
        <span aria-label={`Image ${index + 1} of ${businessActivities.length}`}>{String(index + 1).padStart(2, "0")} / {String(businessActivities.length).padStart(2, "0")}</span>
        <div className={styles.slideshowProgress} aria-hidden="true">{businessActivities.map((activity, position) => <i key={activity.id} className={position === index ? styles.slideshowActive : undefined} />)}</div>
      </div>
    </div>
  );
}
