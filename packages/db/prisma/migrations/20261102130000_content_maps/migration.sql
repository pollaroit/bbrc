-- CreateTable
CREATE TABLE "post_map" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "post_id" TEXT NOT NULL,
    "center_lng" DOUBLE PRECISION NOT NULL,
    "center_lat" DOUBLE PRECISION NOT NULL,
    "zoom" INTEGER NOT NULL,
    "marker_lng" DOUBLE PRECISION,
    "marker_lat" DOUBLE PRECISION,

    CONSTRAINT "post_map_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comment_map" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "comment_id" TEXT NOT NULL,
    "center_lng" DOUBLE PRECISION NOT NULL,
    "center_lat" DOUBLE PRECISION NOT NULL,
    "zoom" INTEGER NOT NULL,
    "marker_lng" DOUBLE PRECISION,
    "marker_lat" DOUBLE PRECISION,

    CONSTRAINT "comment_map_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "post_map_post_id_key" ON "post_map"("post_id");

-- CreateIndex
CREATE UNIQUE INDEX "comment_map_comment_id_key" ON "comment_map"("comment_id");

-- AddForeignKey
ALTER TABLE "post_map" ADD CONSTRAINT "post_map_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comment_map" ADD CONSTRAINT "comment_map_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
