package com.wrenchit.stores.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.wrenchit.stores.entity.Store;

public interface StoreRepository extends JpaRepository<Store, UUID> {
    Optional<Store> findByGooglePlaceId(String googlePlaceId);

    List<Store> findByGooglePlaceIdIn(List<String> googlePlaceIds);

    @Query(value = """
            select *
            from stores
            where (search_vector @@ plainto_tsquery('english', :query)
                   or similarity(name, :query) > :minSimilarity)
              and (:minRating is null or rating >= :minRating)
              and (:servicesContains is null or services_text ilike concat('%', :servicesContains, '%'))
              and (:city is null or lower(city) = lower(:city))
              and (:state is null or lower(state) = lower(:state))
              and (:hasWebsite is null or (:hasWebsite = true and website is not null and website <> '') or (:hasWebsite = false and (website is null or website = '')))
              and (:hasPhone is null or (:hasPhone = true and phone is not null and phone <> '') or (:hasPhone = false and (phone is null or phone = '')))
            order by ts_rank(search_vector, plainto_tsquery('english', :query)) desc,
                     similarity(name, :query) desc
            limit :limit offset :offset
            """, nativeQuery = true)
    List<Store> searchLocal(@Param("query") String query,
                            @Param("minSimilarity") double minSimilarity,
                            @Param("minRating") Double minRating,
                            @Param("servicesContains") String servicesContains,
                            @Param("city") String city,
                            @Param("state") String state,
                            @Param("hasWebsite") Boolean hasWebsite,
                            @Param("hasPhone") Boolean hasPhone,
                            @Param("limit") int limit,
                            @Param("offset") int offset);

    @Query(value = """
            select count(*)
            from stores
            where (search_vector @@ plainto_tsquery('english', :query)
                   or similarity(name, :query) > :minSimilarity)
              and (:minRating is null or rating >= :minRating)
              and (:servicesContains is null or services_text ilike concat('%', :servicesContains, '%'))
              and (:city is null or lower(city) = lower(:city))
              and (:state is null or lower(state) = lower(:state))
              and (:hasWebsite is null or (:hasWebsite = true and website is not null and website <> '') or (:hasWebsite = false and (website is null or website = '')))
              and (:hasPhone is null or (:hasPhone = true and phone is not null and phone <> '') or (:hasPhone = false and (phone is null or phone = '')))
            """, nativeQuery = true)
    long countLocal(@Param("query") String query,
                    @Param("minSimilarity") double minSimilarity,
                    @Param("minRating") Double minRating,
                    @Param("servicesContains") String servicesContains,
                    @Param("city") String city,
                    @Param("state") String state,
                    @Param("hasWebsite") Boolean hasWebsite,
                    @Param("hasPhone") Boolean hasPhone);

    @Query(value = """
            select *
            from stores
            where lat is not null and lng is not null
              and (:minRating is null or rating >= :minRating)
              and (:servicesContains is null or services_text ilike concat('%', :servicesContains, '%'))
              and (:city is null or lower(city) = lower(:city))
              and (:state is null or lower(state) = lower(:state))
              and (:hasWebsite is null or (:hasWebsite = true and website is not null and website <> '') or (:hasWebsite = false and (website is null or website = '')))
              and (:hasPhone is null or (:hasPhone = true and phone is not null and phone <> '') or (:hasPhone = false and (phone is null or phone = '')))
              and (
                6371 * acos(
                  cos(radians(:lat)) * cos(radians(lat)) * cos(radians(lng) - radians(:lng)) +
                  sin(radians(:lat)) * sin(radians(lat))
                )
              ) <= :radiusKm
            order by (
                6371 * acos(
                  cos(radians(:lat)) * cos(radians(lat)) * cos(radians(lng) - radians(:lng)) +
                  sin(radians(:lat)) * sin(radians(lat))
                )
              ) asc
            limit :limit offset :offset
            """, nativeQuery = true)
    List<Store> searchWithinRadius(@Param("lat") double lat,
                                   @Param("lng") double lng,
                                   @Param("radiusKm") double radiusKm,
                                   @Param("minRating") Double minRating,
                                   @Param("servicesContains") String servicesContains,
                                   @Param("city") String city,
                                   @Param("state") String state,
                                   @Param("hasWebsite") Boolean hasWebsite,
                                   @Param("hasPhone") Boolean hasPhone,
                                   @Param("limit") int limit,
                                   @Param("offset") int offset);

    @Query(value = """
            select count(*)
            from stores
            where lat is not null and lng is not null
              and (:minRating is null or rating >= :minRating)
              and (:servicesContains is null or services_text ilike concat('%', :servicesContains, '%'))
              and (:city is null or lower(city) = lower(:city))
              and (:state is null or lower(state) = lower(:state))
              and (:hasWebsite is null or (:hasWebsite = true and website is not null and website <> '') or (:hasWebsite = false and (website is null or website = '')))
              and (:hasPhone is null or (:hasPhone = true and phone is not null and phone <> '') or (:hasPhone = false and (phone is null or phone = '')))
              and (
                6371 * acos(
                  cos(radians(:lat)) * cos(radians(lat)) * cos(radians(lng) - radians(:lng)) +
                  sin(radians(:lat)) * sin(radians(lat))
                )
              ) <= :radiusKm
            """, nativeQuery = true)
    long countWithinRadius(@Param("lat") double lat,
                           @Param("lng") double lng,
                           @Param("radiusKm") double radiusKm,
                           @Param("minRating") Double minRating,
                           @Param("servicesContains") String servicesContains,
                           @Param("city") String city,
                           @Param("state") String state,
                           @Param("hasWebsite") Boolean hasWebsite,
                           @Param("hasPhone") Boolean hasPhone);

    @Query(value = """
            select *
            from stores
            where lat is not null and lng is not null
              and (search_vector @@ plainto_tsquery('english', :query)
                   or similarity(name, :query) > :minSimilarity)
              and (:minRating is null or rating >= :minRating)
              and (:servicesContains is null or services_text ilike concat('%', :servicesContains, '%'))
              and (:city is null or lower(city) = lower(:city))
              and (:state is null or lower(state) = lower(:state))
              and (:hasWebsite is null or (:hasWebsite = true and website is not null and website <> '') or (:hasWebsite = false and (website is null or website = '')))
              and (:hasPhone is null or (:hasPhone = true and phone is not null and phone <> '') or (:hasPhone = false and (phone is null or phone = '')))
              and (
                6371 * acos(
                  cos(radians(:lat)) * cos(radians(lat)) * cos(radians(lng) - radians(:lng)) +
                  sin(radians(:lat)) * sin(radians(lat))
                )
              ) <= :radiusKm
            order by ts_rank(search_vector, plainto_tsquery('english', :query)) desc,
                     similarity(name, :query) desc
            limit :limit offset :offset
            """, nativeQuery = true)
    List<Store> searchLocalWithinRadius(@Param("query") String query,
                                        @Param("minSimilarity") double minSimilarity,
                                        @Param("lat") double lat,
                                        @Param("lng") double lng,
                                        @Param("radiusKm") double radiusKm,
                                        @Param("minRating") Double minRating,
                                        @Param("servicesContains") String servicesContains,
                                        @Param("city") String city,
                                        @Param("state") String state,
                                        @Param("hasWebsite") Boolean hasWebsite,
                                        @Param("hasPhone") Boolean hasPhone,
                                        @Param("limit") int limit,
                                        @Param("offset") int offset);

    @Query(value = """
            select count(*)
            from stores
            where lat is not null and lng is not null
              and (search_vector @@ plainto_tsquery('english', :query)
                   or similarity(name, :query) > :minSimilarity)
              and (:minRating is null or rating >= :minRating)
              and (:servicesContains is null or services_text ilike concat('%', :servicesContains, '%'))
              and (:city is null or lower(city) = lower(:city))
              and (:state is null or lower(state) = lower(:state))
              and (:hasWebsite is null or (:hasWebsite = true and website is not null and website <> '') or (:hasWebsite = false and (website is null or website = '')))
              and (:hasPhone is null or (:hasPhone = true and phone is not null and phone <> '') or (:hasPhone = false and (phone is null or phone = '')))
              and (
                6371 * acos(
                  cos(radians(:lat)) * cos(radians(lat)) * cos(radians(lng) - radians(:lng)) +
                  sin(radians(:lat)) * sin(radians(lat))
                )
              ) <= :radiusKm
            """, nativeQuery = true)
    long countLocalWithinRadius(@Param("query") String query,
                                @Param("minSimilarity") double minSimilarity,
                                @Param("lat") double lat,
                                @Param("lng") double lng,
                                @Param("radiusKm") double radiusKm,
                                @Param("minRating") Double minRating,
                                @Param("servicesContains") String servicesContains,
                                @Param("city") String city,
                                @Param("state") String state,
                                @Param("hasWebsite") Boolean hasWebsite,
                                @Param("hasPhone") Boolean hasPhone);

    @Query("""
            select s
            from Store s
            where (:minRating is null or s.rating >= :minRating)
              and (
                :servicesContains is null
                or lower(coalesce(s.servicesText, '')) like concat('%', lower(cast(:servicesContains as string)), '%')
              )
              and (:city is null or lower(s.city) = lower(cast(:city as string)))
              and (:state is null or lower(s.state) = lower(cast(:state as string)))
              and (
                :hasWebsite is null
                or (:hasWebsite = true and s.website is not null and s.website <> '')
                or (:hasWebsite = false and (s.website is null or s.website = ''))
              )
              and (
                :hasPhone is null
                or (:hasPhone = true and s.phone is not null and s.phone <> '')
                or (:hasPhone = false and (s.phone is null or s.phone = ''))
              )
            """)
    Page<Store> searchAllFiltered(@Param("minRating") Double minRating,
                                  @Param("servicesContains") String servicesContains,
                                  @Param("city") String city,
                                  @Param("state") String state,
                                  @Param("hasWebsite") Boolean hasWebsite,
                                  @Param("hasPhone") Boolean hasPhone,
                                  Pageable pageable);

    List<Store> findAllByOrderByRatingCountDesc(Pageable pageable);
}
