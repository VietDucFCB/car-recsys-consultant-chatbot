"""
Item-based Collaborative Filtering Recommendation Engine
Based on user interactions (view, click, save, contact) with vehicles

Key concepts:
1. Interaction weights: Different actions have different importance
2. Time decay: Recent interactions are more important
3. Item similarity: Vehicles are similar if interacted by similar users
4. Content boosting: Use vehicle features to boost similar items
"""
import numpy as np
from scipy.sparse import csr_matrix
from sklearn.metrics.pairwise import cosine_similarity
from collections import defaultdict
from typing import List, Dict, Tuple, Optional, Any
from datetime import datetime, timedelta
import math
import logging
from sqlalchemy.orm import Session
from sqlalchemy import text

logger = logging.getLogger(__name__)


# Interaction weights based on user intent strength
INTERACTION_WEIGHTS = {
    'view': 1.0,
    'click': 2.0,
    'compare': 3.0,
    'save': 4.0,
    'favorite': 4.0,
    'contact': 8.0,
    'inquiry': 8.0,
}

# Time decay parameter (lambda)
TIME_DECAY_LAMBDA = 0.1  # Higher = faster decay


class RecommendationEngine:
    """
    Item-based Collaborative Filtering Engine for Vehicle Recommendations
    
    Algorithm:
    1. Build user-item interaction matrix with weighted scores
    2. Apply time decay to prioritize recent interactions
    3. Compute item-item similarity using cosine similarity
    4. For a given vehicle, find top-K similar vehicles
    5. Optionally boost with content-based features
    """
    
    def __init__(self, db: Session):
        self.db = db
        self.item_similarity_matrix = None
        self.vehicle_id_to_idx = {}
        self.idx_to_vehicle_id = {}
        self.user_id_to_idx = {}
        self.interaction_matrix = None
        self.is_fitted = False
        
    def _calculate_time_decay(self, interaction_time: datetime, lambda_param: float = TIME_DECAY_LAMBDA) -> float:
        """
        Calculate time decay weight for an interaction.
        score = weight × exp(-λ × days_since_interaction)
        """
        now = datetime.utcnow()
        days_diff = (now - interaction_time).days
        return math.exp(-lambda_param * days_diff)
    
    def _get_interactions(self, days_lookback: int = 90) -> List[Dict]:
        """Fetch user interactions from database"""
        cutoff_date = datetime.utcnow() - timedelta(days=days_lookback)
        
        query = text("""
            SELECT 
                user_id::text,
                vehicle_id,
                interaction_type,
                interaction_score,
                created_at
            FROM gold.user_interactions
            WHERE created_at >= :cutoff_date
            ORDER BY created_at DESC
        """)
        
        result = self.db.execute(query, {'cutoff_date': cutoff_date})
        interactions = []
        for row in result:
            interactions.append({
                'user_id': row[0],
                'vehicle_id': row[1],
                'interaction_type': row[2],
                'interaction_score': float(row[3]) if row[3] else 1.0,
                'created_at': row[4]
            })
        return interactions
    
    def _build_interaction_matrix(self, interactions: List[Dict]) -> csr_matrix:
        """
        Build user-item interaction matrix with weighted scores
        Matrix[user_idx, item_idx] = sum of weighted interactions
        """
        # Build mappings
        vehicle_ids = list(set(i['vehicle_id'] for i in interactions))
        user_ids = list(set(i['user_id'] for i in interactions))
        
        self.vehicle_id_to_idx = {vid: idx for idx, vid in enumerate(vehicle_ids)}
        self.idx_to_vehicle_id = {idx: vid for vid, idx in self.vehicle_id_to_idx.items()}
        self.user_id_to_idx = {uid: idx for idx, uid in enumerate(user_ids)}
        
        n_users = len(user_ids)
        n_items = len(vehicle_ids)
        
        # Aggregate scores
        scores = defaultdict(float)
        for interaction in interactions:
            user_idx = self.user_id_to_idx[interaction['user_id']]
            item_idx = self.vehicle_id_to_idx[interaction['vehicle_id']]
            
            # Get weight for interaction type
            base_weight = INTERACTION_WEIGHTS.get(interaction['interaction_type'], 1.0)
            
            # Apply time decay
            time_decay = self._calculate_time_decay(interaction['created_at'])
            
            # Custom score override if provided
            custom_score = interaction['interaction_score'] or 1.0
            
            # Final weighted score
            final_score = base_weight * time_decay * custom_score
            scores[(user_idx, item_idx)] += final_score
        
        # Build sparse matrix
        rows, cols, data = [], [], []
        for (user_idx, item_idx), score in scores.items():
            rows.append(user_idx)
            cols.append(item_idx)
            data.append(score)
        
        matrix = csr_matrix((data, (rows, cols)), shape=(n_users, n_items))
        return matrix
    
    def fit(self, days_lookback: int = 90) -> 'RecommendationEngine':
        """
        Fit the recommendation model on historical interactions
        Computes item-item similarity matrix
        """
        logger.info("Fitting recommendation engine...")
        
        # Get interactions
        interactions = self._get_interactions(days_lookback)
        
        if not interactions:
            logger.warning("No interactions found. Using content-based fallback.")
            self.is_fitted = False
            return self
        
        logger.info(f"Found {len(interactions)} interactions")
        
        # Build user-item matrix
        self.interaction_matrix = self._build_interaction_matrix(interactions)
        
        # Compute item-item similarity (transpose to get item-user, then compute cosine)
        # Item similarity = cosine(item_vectors) where item_vector = users who interacted
        item_user_matrix = self.interaction_matrix.T
        
        if item_user_matrix.shape[0] > 1:
            self.item_similarity_matrix = cosine_similarity(item_user_matrix)
        else:
            self.item_similarity_matrix = np.array([[1.0]])
        
        self.is_fitted = True
        logger.info(f"Fitted model with {item_user_matrix.shape[0]} items, {item_user_matrix.shape[1]} users")
        
        return self
    
    def get_similar_vehicles(
        self, 
        vehicle_id: str, 
        top_k: int = 10,
        exclude_ids: Optional[List[str]] = None
    ) -> List[Tuple[str, float]]:
        """
        Get top-K similar vehicles based on collaborative filtering
        
        Args:
            vehicle_id: The reference vehicle ID
            top_k: Number of recommendations
            exclude_ids: Vehicle IDs to exclude (e.g., already viewed)
            
        Returns:
            List of (vehicle_id, similarity_score) tuples
        """
        if not self.is_fitted or vehicle_id not in self.vehicle_id_to_idx:
            # Fallback to content-based
            return self._content_based_similar(vehicle_id, top_k, exclude_ids)
        
        idx = self.vehicle_id_to_idx[vehicle_id]
        similarities = self.item_similarity_matrix[idx]
        
        # Get top-K indices (excluding self)
        exclude_ids = exclude_ids or []
        exclude_idx = {self.vehicle_id_to_idx.get(vid) for vid in exclude_ids}
        exclude_idx.add(idx)  # Exclude self
        
        # Sort by similarity
        sorted_indices = np.argsort(similarities)[::-1]
        
        results = []
        for sim_idx in sorted_indices:
            if sim_idx in exclude_idx:
                continue
            if len(results) >= top_k:
                break
            
            vid = self.idx_to_vehicle_id[sim_idx]
            score = float(similarities[sim_idx])
            results.append((vid, score))
        
        return results
    
    def _content_based_similar(
        self, 
        vehicle_id: str, 
        top_k: int = 10,
        exclude_ids: Optional[List[str]] = None
    ) -> List[Tuple[str, float]]:
        """
        Content-based fallback: Find similar vehicles by features
        Used for cold-start items or when CF data is insufficient
        """
        exclude_ids = exclude_ids or []
        
        # Get reference vehicle features
        query = text("""
            SELECT brand, car_model, price, fuel_type, transmission, drivetrain,
                   car_rating, mileage
            FROM raw.used_vehicles
            WHERE vehicle_id = :vehicle_id
        """)
        result = self.db.execute(query, {'vehicle_id': vehicle_id}).fetchone()
        
        if not result:
            return []
        
        ref_brand, ref_model, ref_price, ref_fuel, ref_trans, ref_drive, ref_rating, ref_mileage = result
        
        # Find similar by features with scoring
        similar_query = text("""
            SELECT vehicle_id,
                   (CASE WHEN brand = :brand THEN 2.0 ELSE 0 END) +
                   (CASE WHEN car_model = :model THEN 1.5 ELSE 0 END) +
                   (CASE WHEN fuel_type = :fuel THEN 0.5 ELSE 0 END) +
                   (CASE WHEN transmission = :trans THEN 0.5 ELSE 0 END) +
                   (CASE WHEN drivetrain = :drive THEN 0.3 ELSE 0 END) +
                   (CASE WHEN price BETWEEN :price_min AND :price_max THEN 1.0 ELSE 0 END) as score
            FROM raw.used_vehicles
            WHERE vehicle_id != :vehicle_id
              AND vehicle_id NOT IN :exclude_ids
              AND brand IS NOT NULL
            ORDER BY score DESC, car_rating DESC NULLS LAST
            LIMIT :top_k
        """)
        
        price_min = float(ref_price) * 0.7 if ref_price else 0
        price_max = float(ref_price) * 1.3 if ref_price else 999999999
        
        # Handle empty exclude list
        exclude_tuple = tuple(exclude_ids) if exclude_ids else ('',)
        
        results = self.db.execute(similar_query, {
            'vehicle_id': vehicle_id,
            'brand': ref_brand,
            'model': ref_model,
            'fuel': ref_fuel,
            'trans': ref_trans,
            'drive': ref_drive,
            'price_min': price_min,
            'price_max': price_max,
            'exclude_ids': exclude_tuple,
            'top_k': top_k
        })
        
        return [(row[0], float(row[1])) for row in results]
    
    def get_personalized_recommendations(
        self,
        user_id: str,
        top_k: int = 20,
        exclude_interacted: bool = True
    ) -> List[Tuple[str, float, str]]:
        """
        Get personalized recommendations for a user based on their interaction history
        
        Algorithm:
        1. Get user's recent interactions
        2. For each interacted vehicle, get similar vehicles
        3. Aggregate and rank by weighted scores
        4. Apply diversity (optional)
        
        Returns:
            List of (vehicle_id, score, reason) tuples
        """
        # Get user's interaction history
        user_query = text("""
            SELECT vehicle_id, interaction_type, interaction_score, created_at
            FROM gold.user_interactions
            WHERE user_id = :user_id::uuid
            ORDER BY created_at DESC
            LIMIT 50
        """)
        
        user_interactions = self.db.execute(user_query, {'user_id': user_id}).fetchall()
        
        if not user_interactions:
            # Cold-start user: return popular vehicles
            return self._get_popular_vehicles(top_k)
        
        # Get vehicles to exclude
        exclude_ids = set()
        if exclude_interacted:
            exclude_ids = {row[0] for row in user_interactions}
        
        # Aggregate recommendations from similar items
        recommendation_scores = defaultdict(float)
        recommendation_reasons = {}
        
        for vehicle_id, interaction_type, score, created_at in user_interactions:
            weight = INTERACTION_WEIGHTS.get(interaction_type, 1.0)
            time_decay = self._calculate_time_decay(created_at)
            
            # Get similar vehicles
            similar = self.get_similar_vehicles(
                vehicle_id, 
                top_k=10, 
                exclude_ids=list(exclude_ids)
            )
            
            for sim_vid, sim_score in similar:
                contribution = weight * time_decay * sim_score
                recommendation_scores[sim_vid] += contribution
                
                if sim_vid not in recommendation_reasons or contribution > recommendation_scores.get(sim_vid, 0) * 0.5:
                    recommendation_reasons[sim_vid] = f"Similar to vehicles you {interaction_type}d"
        
        # Sort by aggregated score
        sorted_recs = sorted(
            recommendation_scores.items(), 
            key=lambda x: x[1], 
            reverse=True
        )[:top_k]
        
        results = [
            (vid, score, recommendation_reasons.get(vid, "Based on your preferences"))
            for vid, score in sorted_recs
        ]
        
        return results
    
    def _get_popular_vehicles(self, top_k: int = 20) -> List[Tuple[str, float, str]]:
        """Get popular vehicles for cold-start users"""
        query = text("""
            SELECT 
                v.vehicle_id,
                COALESCE(COUNT(ui.id), 0) + COALESCE(v.car_rating, 0) as popularity_score
            FROM raw.used_vehicles v
            LEFT JOIN gold.user_interactions ui ON v.vehicle_id = ui.vehicle_id
            WHERE v.title IS NOT NULL
            GROUP BY v.vehicle_id, v.car_rating
            ORDER BY popularity_score DESC, v.car_rating DESC NULLS LAST
            LIMIT :top_k
        """)
        
        results = self.db.execute(query, {'top_k': top_k})
        
        return [
            (row[0], float(row[1]), "Popular vehicle")
            for row in results
        ]
    
    def get_candidate_recommendations(
        self,
        user_id: Optional[str] = None,
        filters: Optional[Dict[str, Any]] = None,
        top_k: int = 100
    ) -> List[Tuple[str, float, str]]:
        """
        Get candidate recommendations for the recommendation pipeline
        This is the first stage that generates a large candidate set
        
        Stage 1: Candidate Generation (this method)
        Stage 2: Re-ranking (apply business logic, filters)
        Stage 3: Final selection (diversity, freshness)
        """
        if user_id:
            candidates = self.get_personalized_recommendations(user_id, top_k * 2)
        else:
            candidates = self._get_popular_vehicles(top_k * 2)
        
        # Apply filters if provided
        if filters:
            candidates = self._apply_filters(candidates, filters)
        
        return candidates[:top_k]
    
    def _apply_filters(
        self, 
        candidates: List[Tuple[str, float, str]], 
        filters: Dict[str, Any]
    ) -> List[Tuple[str, float, str]]:
        """Apply business filters to candidates"""
        if not filters:
            return candidates
        
        vehicle_ids = [c[0] for c in candidates]
        if not vehicle_ids:
            return []
        
        # Build filter conditions
        conditions = ["vehicle_id IN :ids"]
        params = {'ids': tuple(vehicle_ids)}
        
        if filters.get('brand'):
            conditions.append("brand = :brand")
            params['brand'] = filters['brand']
        
        if filters.get('price_min'):
            conditions.append("price >= :price_min")
            params['price_min'] = filters['price_min']
        
        if filters.get('price_max'):
            conditions.append("price <= :price_max")
            params['price_max'] = filters['price_max']
        
        if filters.get('fuel_type'):
            conditions.append("fuel_type = :fuel_type")
            params['fuel_type'] = filters['fuel_type']
        
        where_clause = " AND ".join(conditions)
        
        query = text(f"""
            SELECT vehicle_id
            FROM raw.used_vehicles
            WHERE {where_clause}
        """)
        
        valid_ids = {row[0] for row in self.db.execute(query, params)}
        
        return [c for c in candidates if c[0] in valid_ids]
