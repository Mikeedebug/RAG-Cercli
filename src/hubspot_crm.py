"""HubSpot CRM client for fetching Leads and Deals with pipeline stage history."""

import logging
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Optional

import requests

logger = logging.getLogger(__name__)


@dataclass
class StageHistory:
    """Represents a pipeline stage transition."""

    stage_id: str
    stage_name: str
    entered_at: Optional[datetime] = None
    exited_at: Optional[datetime] = None
    time_in_stage: Optional[timedelta] = None

    def to_dict(self) -> dict:
        return {
            "stage_id": self.stage_id,
            "stage_name": self.stage_name,
            "entered_at": self.entered_at.isoformat() if self.entered_at else None,
            "exited_at": self.exited_at.isoformat() if self.exited_at else None,
            "time_in_stage_days": self.time_in_stage.days if self.time_in_stage else None,
            "time_in_stage_hours": (
                self.time_in_stage.total_seconds() / 3600 if self.time_in_stage else None
            ),
        }


@dataclass
class Lead:
    """Represents a HubSpot Lead (Contact in a pipeline)."""

    id: str
    name: str
    email: Optional[str] = None
    lifecycle_stage: Optional[str] = None
    lead_status: Optional[str] = None
    created_at: Optional[datetime] = None
    stage_history: list[StageHistory] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "lifecycle_stage": self.lifecycle_stage,
            "lead_status": self.lead_status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "stage_history": [s.to_dict() for s in self.stage_history],
        }

    def to_text(self) -> str:
        """Convert lead to searchable text for RAG."""
        lines = [
            f"Lead: {self.name}",
            f"Email: {self.email or 'N/A'}",
            f"Lifecycle Stage: {self.lifecycle_stage or 'N/A'}",
            f"Lead Status: {self.lead_status or 'N/A'}",
            f"Created: {self.created_at.strftime('%Y-%m-%d') if self.created_at else 'N/A'}",
        ]

        if self.stage_history:
            lines.append("\nPipeline Stage History:")
            for stage in self.stage_history:
                entered = stage.entered_at.strftime('%Y-%m-%d %H:%M') if stage.entered_at else 'N/A'
                exited = stage.exited_at.strftime('%Y-%m-%d %H:%M') if stage.exited_at else 'Current'
                time_str = f"{stage.time_in_stage.days}d {stage.time_in_stage.seconds // 3600}h" if stage.time_in_stage else 'N/A'
                lines.append(f"  - {stage.stage_name}: Entered {entered}, Exited {exited}, Time in stage: {time_str}")

        return "\n".join(lines)


@dataclass
class Deal:
    """Represents a HubSpot Deal with pipeline stage tracking."""

    id: str
    name: str
    amount: Optional[float] = None
    weighted_amount: Optional[float] = None
    deal_stage: Optional[str] = None
    pipeline: Optional[str] = None
    close_date: Optional[datetime] = None
    created_at: Optional[datetime] = None
    stage_history: list[StageHistory] = field(default_factory=list)
    cumulative_time_per_stage: dict = field(default_factory=dict)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "amount": self.amount,
            "weighted_amount": self.weighted_amount,
            "deal_stage": self.deal_stage,
            "pipeline": self.pipeline,
            "close_date": self.close_date.isoformat() if self.close_date else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "stage_history": [s.to_dict() for s in self.stage_history],
            "cumulative_time_per_stage": {
                k: {"days": v.days, "hours": v.total_seconds() / 3600}
                for k, v in self.cumulative_time_per_stage.items()
            },
        }

    def to_text(self) -> str:
        """Convert deal to searchable text for RAG."""
        lines = [
            f"Deal: {self.name}",
            f"Amount: ${self.amount:,.2f}" if self.amount else "Amount: N/A",
            f"Weighted Amount: ${self.weighted_amount:,.2f}" if self.weighted_amount else "Weighted Amount: N/A",
            f"Current Stage: {self.deal_stage or 'N/A'}",
            f"Pipeline: {self.pipeline or 'N/A'}",
            f"Close Date: {self.close_date.strftime('%Y-%m-%d') if self.close_date else 'N/A'}",
            f"Created: {self.created_at.strftime('%Y-%m-%d') if self.created_at else 'N/A'}",
        ]

        if self.stage_history:
            lines.append("\nPipeline Stage History:")
            for stage in self.stage_history:
                entered = stage.entered_at.strftime('%Y-%m-%d %H:%M') if stage.entered_at else 'N/A'
                exited = stage.exited_at.strftime('%Y-%m-%d %H:%M') if stage.exited_at else 'Current'
                time_str = f"{stage.time_in_stage.days}d {stage.time_in_stage.seconds // 3600}h" if stage.time_in_stage else 'N/A'
                lines.append(f"  - {stage.stage_name}: Entered {entered}, Exited {exited}, Time: {time_str}")

        if self.cumulative_time_per_stage:
            lines.append("\nCumulative Time Per Stage:")
            for stage_name, duration in self.cumulative_time_per_stage.items():
                lines.append(f"  - {stage_name}: {duration.days}d {duration.seconds // 3600}h")

        return "\n".join(lines)


class HubSpotCRMClient:
    """Client for fetching Leads and Deals from HubSpot CRM."""

    BASE_URL = "https://api.hubapi.com"

    def __init__(self, access_token: str):
        """Initialize the HubSpot CRM client.

        Args:
            access_token: HubSpot private app access token.
        """
        self.access_token = access_token
        self.session = requests.Session()
        self.session.headers.update({
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
        })

        # Cache for pipeline stages
        self._pipeline_stages: dict = {}
        self._deal_pipelines: dict = {}

    def _get(self, endpoint: str, params: Optional[dict] = None) -> dict:
        """Make a GET request to the HubSpot API."""
        url = f"{self.BASE_URL}{endpoint}"
        response = self.session.get(url, params=params)
        response.raise_for_status()
        return response.json()

    def _parse_datetime(self, dt_string: Optional[str]) -> Optional[datetime]:
        """Parse a datetime string from HubSpot API."""
        if not dt_string:
            return None
        try:
            return datetime.fromisoformat(dt_string.replace("Z", "+00:00"))
        except ValueError:
            try:
                # Try parsing millisecond timestamp
                return datetime.fromtimestamp(int(dt_string) / 1000)
            except (ValueError, TypeError):
                return None

    def _load_deal_pipelines(self):
        """Load deal pipelines and their stages."""
        if self._deal_pipelines:
            return

        try:
            response = self._get("/crm/v3/pipelines/deals")
            for pipeline in response.get("results", []):
                pipeline_id = pipeline["id"]
                pipeline_name = pipeline["label"]
                self._deal_pipelines[pipeline_id] = pipeline_name

                for stage in pipeline.get("stages", []):
                    stage_id = stage["id"]
                    self._pipeline_stages[stage_id] = {
                        "name": stage["label"],
                        "pipeline": pipeline_name,
                        "display_order": stage.get("displayOrder", 0),
                        "probability": stage.get("metadata", {}).get("probability", 0),
                    }

            logger.info(f"Loaded {len(self._deal_pipelines)} pipelines with {len(self._pipeline_stages)} stages")
        except Exception as e:
            logger.warning(f"Could not load pipelines: {e}")

    def _get_stage_name(self, stage_id: str) -> str:
        """Get stage name from stage ID."""
        self._load_deal_pipelines()
        return self._pipeline_stages.get(stage_id, {}).get("name", stage_id)

    def _get_stage_probability(self, stage_id: str) -> float:
        """Get stage probability for weighted amount calculation."""
        self._load_deal_pipelines()
        prob = self._pipeline_stages.get(stage_id, {}).get("probability", 0)
        try:
            return float(prob) / 100 if float(prob) > 1 else float(prob)
        except (ValueError, TypeError):
            return 0

    def get_property_history(
        self,
        object_type: str,
        object_id: str,
        property_name: str,
    ) -> list[dict]:
        """Fetch property history for an object.

        Args:
            object_type: Type of object (contacts, deals).
            object_id: ID of the object.
            property_name: Name of the property to get history for.

        Returns:
            List of history entries with timestamp and value.
        """
        try:
            response = self._get(
                f"/crm/v3/objects/{object_type}/{object_id}",
                params={
                    "properties": property_name,
                    "propertiesWithHistory": property_name,
                }
            )

            history = response.get("propertiesWithHistory", {}).get(property_name, [])
            return sorted(history, key=lambda x: x.get("timestamp", ""))
        except Exception as e:
            logger.warning(f"Could not fetch property history: {e}")
            return []

    def _build_stage_history(
        self,
        object_type: str,
        object_id: str,
        stage_property: str = "dealstage",
    ) -> tuple[list[StageHistory], dict]:
        """Build stage history from property history.

        Args:
            object_type: Type of object.
            object_id: ID of the object.
            stage_property: Property name for stage.

        Returns:
            Tuple of (stage_history list, cumulative_time dict).
        """
        history_data = self.get_property_history(object_type, object_id, stage_property)

        if not history_data:
            return [], {}

        stage_history = []
        cumulative_time: dict = {}

        for i, entry in enumerate(history_data):
            stage_id = entry.get("value")
            stage_name = self._get_stage_name(stage_id)
            entered_at = self._parse_datetime(entry.get("timestamp"))

            # Calculate exit time (next entry's timestamp or None if current)
            exited_at = None
            if i < len(history_data) - 1:
                exited_at = self._parse_datetime(history_data[i + 1].get("timestamp"))

            # Calculate time in stage
            time_in_stage = None
            if entered_at:
                if exited_at:
                    time_in_stage = exited_at - entered_at
                else:
                    time_in_stage = datetime.now(entered_at.tzinfo) - entered_at

            stage_entry = StageHistory(
                stage_id=stage_id,
                stage_name=stage_name,
                entered_at=entered_at,
                exited_at=exited_at,
                time_in_stage=time_in_stage,
            )
            stage_history.append(stage_entry)

            # Accumulate time per stage
            if time_in_stage:
                if stage_name not in cumulative_time:
                    cumulative_time[stage_name] = timedelta()
                cumulative_time[stage_name] += time_in_stage

        return stage_history, cumulative_time

    def get_leads(
        self,
        limit: int = 100,
        include_stage_history: bool = True,
    ) -> list[Lead]:
        """Fetch leads (contacts) from HubSpot.

        Args:
            limit: Maximum number of leads to fetch.
            include_stage_history: Whether to fetch stage history for each lead.

        Returns:
            List of Lead objects.
        """
        leads = []
        after = None

        properties = [
            "firstname",
            "lastname",
            "email",
            "lifecyclestage",
            "hs_lead_status",
            "createdate",
        ]

        while len(leads) < limit:
            params = {
                "limit": min(100, limit - len(leads)),
                "properties": ",".join(properties),
            }
            if after:
                params["after"] = after

            try:
                response = self._get("/crm/v3/objects/contacts", params)

                for item in response.get("results", []):
                    props = item.get("properties", {})

                    # Build name from first and last
                    firstname = props.get("firstname", "") or ""
                    lastname = props.get("lastname", "") or ""
                    name = f"{firstname} {lastname}".strip() or f"Contact {item['id']}"

                    lead = Lead(
                        id=item["id"],
                        name=name,
                        email=props.get("email"),
                        lifecycle_stage=props.get("lifecyclestage"),
                        lead_status=props.get("hs_lead_status"),
                        created_at=self._parse_datetime(props.get("createdate")),
                    )

                    # Fetch stage history if requested
                    if include_stage_history:
                        history, _ = self._build_stage_history(
                            "contacts",
                            item["id"],
                            "lifecyclestage",
                        )
                        lead.stage_history = history

                    leads.append(lead)

                # Check for pagination
                paging = response.get("paging", {})
                next_page = paging.get("next", {})
                after = next_page.get("after")

                if not after:
                    break

            except requests.HTTPError as e:
                logger.error(f"Failed to fetch contacts: {e}")
                break

        logger.info(f"Fetched {len(leads)} leads")
        return leads

    def get_deals(
        self,
        limit: int = 100,
        include_stage_history: bool = True,
    ) -> list[Deal]:
        """Fetch deals from HubSpot with stage history.

        Args:
            limit: Maximum number of deals to fetch.
            include_stage_history: Whether to fetch stage history for each deal.

        Returns:
            List of Deal objects.
        """
        self._load_deal_pipelines()

        deals = []
        after = None

        properties = [
            "dealname",
            "amount",
            "dealstage",
            "pipeline",
            "closedate",
            "createdate",
            "hs_deal_stage_probability",
        ]

        while len(deals) < limit:
            params = {
                "limit": min(100, limit - len(deals)),
                "properties": ",".join(properties),
            }
            if after:
                params["after"] = after

            try:
                response = self._get("/crm/v3/objects/deals", params)

                for item in response.get("results", []):
                    props = item.get("properties", {})

                    # Calculate weighted amount
                    amount = None
                    weighted_amount = None
                    if props.get("amount"):
                        try:
                            amount = float(props["amount"])
                            stage_id = props.get("dealstage", "")
                            probability = self._get_stage_probability(stage_id)
                            weighted_amount = amount * probability
                        except (ValueError, TypeError):
                            pass

                    # Get pipeline name
                    pipeline_id = props.get("pipeline", "")
                    pipeline_name = self._deal_pipelines.get(pipeline_id, pipeline_id)

                    # Get stage name
                    stage_id = props.get("dealstage", "")
                    stage_name = self._get_stage_name(stage_id)

                    deal = Deal(
                        id=item["id"],
                        name=props.get("dealname", f"Deal {item['id']}"),
                        amount=amount,
                        weighted_amount=weighted_amount,
                        deal_stage=stage_name,
                        pipeline=pipeline_name,
                        close_date=self._parse_datetime(props.get("closedate")),
                        created_at=self._parse_datetime(props.get("createdate")),
                    )

                    # Fetch stage history if requested
                    if include_stage_history:
                        history, cumulative = self._build_stage_history(
                            "deals",
                            item["id"],
                            "dealstage",
                        )
                        deal.stage_history = history
                        deal.cumulative_time_per_stage = cumulative

                    deals.append(deal)

                # Check for pagination
                paging = response.get("paging", {})
                next_page = paging.get("next", {})
                after = next_page.get("after")

                if not after:
                    break

            except requests.HTTPError as e:
                logger.error(f"Failed to fetch deals: {e}")
                break

        logger.info(f"Fetched {len(deals)} deals")
        return deals

    def get_all_crm_data(
        self,
        leads_limit: int = 500,
        deals_limit: int = 500,
        include_stage_history: bool = True,
    ) -> dict:
        """Fetch all CRM data (leads and deals).

        Args:
            leads_limit: Maximum number of leads to fetch.
            deals_limit: Maximum number of deals to fetch.
            include_stage_history: Whether to fetch stage history.

        Returns:
            Dictionary with 'leads' and 'deals' lists.
        """
        return {
            "leads": self.get_leads(leads_limit, include_stage_history),
            "deals": self.get_deals(deals_limit, include_stage_history),
        }
