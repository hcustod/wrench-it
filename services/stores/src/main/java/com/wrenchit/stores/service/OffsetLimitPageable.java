package com.wrenchit.stores.service;

import java.io.Serial;
import java.io.Serializable;

import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

final class OffsetLimitPageable implements Pageable, Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    private final int limit;
    private final int offset;
    private final Sort sort;

    private OffsetLimitPageable(int limit, int offset, Sort sort) {
        if (limit < 1) {
            throw new IllegalArgumentException("Limit must be greater than 0");
        }
        if (offset < 0) {
            throw new IllegalArgumentException("Offset must be >= 0");
        }
        this.limit = limit;
        this.offset = offset;
        this.sort = sort == null ? Sort.unsorted() : sort;
    }

    static OffsetLimitPageable of(int limit, int offset, Sort sort) {
        return new OffsetLimitPageable(limit, offset, sort);
    }

    @Override
    public int getPageNumber() {
        return offset / limit;
    }

    @Override
    public int getPageSize() {
        return limit;
    }

    @Override
    public long getOffset() {
        return offset;
    }

    @Override
    public Sort getSort() {
        return sort;
    }

    @Override
    public Pageable next() {
        return new OffsetLimitPageable(limit, offset + limit, sort);
    }

    @Override
    public Pageable previousOrFirst() {
        if (!hasPrevious()) {
            return first();
        }
        return new OffsetLimitPageable(limit, Math.max(0, offset - limit), sort);
    }

    @Override
    public Pageable first() {
        return new OffsetLimitPageable(limit, 0, sort);
    }

    @Override
    public Pageable withPage(int pageNumber) {
        if (pageNumber < 0) {
            throw new IllegalArgumentException("Page index must be >= 0");
        }
        return new OffsetLimitPageable(limit, pageNumber * limit, sort);
    }

    @Override
    public boolean hasPrevious() {
        return offset > 0;
    }
}
